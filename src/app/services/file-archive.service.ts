import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';

import baseUrl from './helper';
import { PageResult } from '../models/pageResult';
import { FileArchive } from '../models/fileArchive';
import { ArchiveQuery } from '../models/ArchiveQuery';
import { NavEpochService } from './nav-epoch.service';
import { ReleaseAtDTO } from '../models/ReleaseAtDTO';

type ReviewableQuery = ArchiveQuery & {
  reviewStatus?: string;
  linkedTaskId?: number;        // <-- NEW
};
type ListArgs = { subjectId?: number, page: number, size: number, opts?: ReviewableQuery };
export type ApproveResp = {
  approved: boolean;
  taskApproved: boolean;
  taskId?: number | null;
  answerBuilt?: boolean;
  answerArchiveId?: number | null;
  answerError?: string | null;
};
export type RegenerateAnswerResp = {
  success: boolean;
  message?: string;
  answerArchiveId?: number;
  filename?: string;
  releaseAt?: string | null;
  error?: string;
};
@Injectable({ providedIn: 'root' })
export class FileArchiveService {
  constructor(private http: HttpClient, private nav: NavEpochService) {
    // Mỗi lần chuyển sang “trang cha” khác -> clear cache cũ để tránh phình bộ nhớ
    this.nav.epoch$.subscribe(() => this.cache.clear());
  }

  list(subjectId?: number, page = 0, size = 20, opts?: ReviewableQuery) {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));

    if (subjectId != null) params = params.set('subjectId', String(subjectId));
    if (opts?.kind) params = params.set('kind', opts.kind);
    if (opts?.q?.trim()) params = params.set('q', opts.q.trim());
    if (opts?.subject?.trim()) params = params.set('subject', opts.subject.trim());
    if (opts?.uploader?.trim()) params = params.set('uploader', opts.uploader.trim());
    if (opts?.from) params = params.set('from', opts.from);
    if (opts?.to) params = params.set('to', opts.to);
    if (opts?.variant) params = params.set('variant', opts.variant);
    if (opts?.reviewStatus) params = params.set('reviewStatus', opts.reviewStatus);

    // <-- NEW: truyền linkedTaskId xuống BE
    if (opts?.linkedTaskId != null) params = params.set('linkedTaskId', String(opts.linkedTaskId));

    return this.http.get<PageResult<FileArchive>>(`${baseUrl}/api/files`, { params });
  }

  // === Caching layer ===
  private TTL = 60_000; // 60s
  private cache = new Map<string, { ts: number; obs$: Observable<PageResult<FileArchive>> }>();

  private keyOf(a: ListArgs) {
    const norm = (o?: Record<string, any>) => {
      const c = { ...(o || {}) };
      Object.keys(c).forEach(k => (c as any)[k] == null && delete (c as any)[k]);
      return c;
    };
    return JSON.stringify({
      epoch: this.nav.epoch,
      subjectId: a.subjectId ?? null,
      page: a.page,
      size: a.size,
      opts: norm(a.opts),
    });
  }

  isCached(a: ListArgs) {
    const k = this.keyOf(a);
    const e = this.cache.get(k);
    return !!e && (Date.now() - e.ts) < this.TTL;
  }

  listCached(a: ListArgs) {
    const k = this.keyOf(a);
    const hit = this.cache.get(k);
    const fresh = hit && (Date.now() - hit.ts) < this.TTL;
    if (fresh) return hit!.obs$;

    const obs$ = this.list(a.subjectId, a.page, a.size, a.opts).pipe(
      tap({
        next: () => {
          const e = this.cache.get(k);
          if (e) e.ts = Date.now();
        },
        error: () => this.cache.delete(k)
      }),
      shareReplay(1)
    );
    this.cache.set(k, { ts: Date.now(), obs$ });
    return obs$;
  }

  /** Gọi khi có thay đổi dữ liệu (approve/reject/delete/import/export) để tránh stale */
  invalidate(predicate?: (k: string) => boolean) {
    if (!predicate) { this.cache.clear(); return; }
    for (const k of Array.from(this.cache.keys())) {
      if (predicate(k)) this.cache.delete(k);
    }
  }

  approve(id: number, opts?: { approveTask?: boolean }) {
    let params = new HttpParams();
    if (opts?.approveTask) params = params.set('approveTask', 'true');
    return this.http.post<ApproveResp>(`${baseUrl}/api/files/${id}/approve`, null, { params });
  }

  getViewUrl(id: number, minutes = 5) {
    return this.http.get<{ url: string }>(`${baseUrl}/api/files/${id}/view-url`, { params: { minutes } });
  }

  getDownloadUrl(id: number, minutes = 5) {
    return this.http.get<{ url: string }>(`${baseUrl}/api/files/${id}/download-url`, { params: { minutes } });
  }

  head(id: number) { return this.http.head<void>(`${baseUrl}/api/files/${id}`); }
  delete(id: number) { return this.http.delete<void>(`${baseUrl}/api/files/${id}`); }
  openView(id: number, minutes = 5) { window.open(`${baseUrl}/api/files/${id}/view?minutes=${minutes}`, '_blank'); }
  download(id: number, minutes = 5) { window.location.href = `${baseUrl}/api/files/${id}/download?minutes=${minutes}`; }

  reject(id: number, reason: string, deadline?: string, reviewerId?: number, opts?: { rejectTask?: boolean }) {
    let params = new HttpParams();
    if (reviewerId != null) params = params.set('reviewerId', String(reviewerId));
    if (opts?.rejectTask) params = params.set('rejectTask', 'true');
    const body = { reason, deadline };
    return this.http.post<void>(`${baseUrl}/api/files/${id}/reject`, body, { params });
  }

  getReleaseAt(id: number) {
    return this.http.get<ReleaseAtDTO>(`${baseUrl}/api/files/${id}/release-at`);
  }
  setReleaseAt(id: number, releaseAt: string | null) {
    return this.http.patch<ReleaseAtDTO>(`${baseUrl}/api/files/${id}/release-at`, { releaseAt });
  }

  uploadAnswer(file: File, subjectId: number) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subjectId', String(subjectId));

    return this.http.post<FileArchive>(`${baseUrl}/api/files/upload-answer`, formData);
  }

  regenerateAnswer(submissionArchiveId: number, releaseAt?: string | null) {
    const body = releaseAt ? { releaseAt } : {};
    return this.http.post<RegenerateAnswerResp>(
      `${baseUrl}/api/files/${submissionArchiveId}/regenerate-answer`,
      body
    );
  }

}
