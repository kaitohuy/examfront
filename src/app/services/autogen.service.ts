// src/app/services/autogen.service.ts
import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpEvent,
  HttpHeaders,
  HttpParams,
  HttpRequest,
  HttpXhrBackend,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import baseUrl from './helper';
import { LoginService } from './login.service';

/** Body gửi lên /autogen/...  khớp với AutoGenRequest phía BE */
export interface AutoGenRequest {
  variants?: number;       // số đề cần sinh
  steps?: any[];           // nếu để mặc định cho service build thì có thể bỏ qua
  labels?: ('EXAM' | 'PRACTICE')[];
}

@Injectable({ providedIn: 'root' })
export class AutogenService {
  constructor(private http: HttpClient, private login: LoginService) { }

  private xhrBackend = inject(HttpXhrBackend, { optional: true });
  private xhrClient = this.xhrBackend ? new HttpClient(this.xhrBackend) : this.http;

  private withAuth<T>(req: HttpRequest<T>): HttpRequest<T> {
    const token = this.login.getToken?.();
    if (!token) return req;
    const headers: HttpHeaders = (req.headers || new HttpHeaders()).set('Authorization', `Bearer ${token}`);
    return req.clone({ headers });
  }

  /**
   * Gọi /subject/{subjectId}/autogen/export
   * - Body: AutoGenRequest (ví dụ: { variants: 5 })
   * - Query: commit, fileName, program, semester, academicYear, classes, duration, examForm, mau
   * - Trả HttpEvent<Blob> để bắt progress và tự download.
   */
  exportZipProgress(
    subjectId: number,
    body?: AutoGenRequest,
    query?: {
      commit?: boolean;
      merge?: boolean;
      fileName?: string;
      program?: string;
      semester?: string;
      academicYear?: string;
      classes?: string;
      duration?: string;
      examForm?: string;
      mau?: string;
      kind?: 'EXAM' | 'PRACTICE';
    }
  ): Observable<HttpEvent<Blob>> {
    let params = new HttpParams().set('commit', String(query?.commit ?? true));
    if (query?.merge) params = params.set('merge', 'true');
    if (query?.fileName) params = params.set('fileName', query.fileName);
    if (query?.program) params = params.set('program', query.program);
    if (query?.semester) params = params.set('semester', query.semester);
    if (query?.academicYear) params = params.set('academicYear', query.academicYear);
    if (query?.classes) params = params.set('classes', query.classes);
    if (query?.duration) params = params.set('duration', query.duration);
    if (query?.examForm) params = params.set('examForm', query.examForm);
    if (query?.mau) params = params.set('mau', query.mau);
    if (query?.kind) params = params.set('kind', query.kind); // NEW

    const url = `${baseUrl}/subject/${subjectId}/autogen/export`;
    const payload = new Blob([JSON.stringify(body ?? {})], { type: 'application/json' });
    const req = new HttpRequest<Blob>('POST', url, payload, {
      reportProgress: true,
      responseType: 'blob' as any,
      params,
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
    return this.xhrClient.request(this.withAuth(req));
  }
}
