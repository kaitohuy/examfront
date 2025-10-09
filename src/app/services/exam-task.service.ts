// services/exam-task.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import baseUrl from './helper';
import { Observable } from 'rxjs';
import { ExamTask, ExamTaskCreateDTO, ExamTaskStatus, ExamTaskUpdateStatusDTO } from '../models/exam-task';
import { PageResult } from '../models/pageResult';

@Injectable({ providedIn: 'root' })
export class ExamTaskService {
  private base = `${baseUrl}/api/exam-tasks`;

  constructor(private http: HttpClient) { }

  list(opts: {
    subjectId?: number;
    status?: ExamTaskStatus;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }): Observable<PageResult<ExamTask>> {
    let params = new HttpParams()
      .set('page', String(opts.page ?? 0))
      .set('size', String(opts.size ?? 20));
    if (opts.subjectId != null) params = params.set('subjectId', String(opts.subjectId));
    if (opts.status) params = params.set('status', opts.status);
    if (opts.from) params = params.set('from', opts.from);
    if (opts.to) params = params.set('to', opts.to);
    return this.http.get<PageResult<ExamTask>>(this.base, { params });
  }

  create(body: ExamTaskCreateDTO): Observable<ExamTask> {
    return this.http.post<ExamTask>(this.base, body);
  }

  // (Giữ lại nếu bạn vẫn muốn dùng route cũ /{id}/status cho IN_PROGRESS)
  updateStatus(id: number, status: 'IN_PROGRESS'): Observable<ExamTask> {
    const payload: ExamTaskUpdateStatusDTO = { status };
    return this.http.post<ExamTask>(`${this.base}/${id}/status`, payload);
  }

  // NEW: start theo route mới /{id}/start
  start(id: number): Observable<ExamTask> {
    return this.http.post<ExamTask>(`${this.base}/${id}/start`, {});
  }

  // NEW: submit multipart
  submit(id: number, file: File, note?: string): Observable<ExamTask> {
    const fd = new FormData();
    fd.append('file', file);
    if (note) fd.append('note', note);
    return this.http.post<ExamTask>(`${this.base}/${id}/submit`, fd);
  }

  // NEW: report lỗi
  report(id: number, note?: string): Observable<ExamTask> {
    return this.http.post<ExamTask>(`${this.base}/${id}/report`, { note: note ?? '' });
  }

  // NEW: head approve
  approve(id: number): Observable<ExamTask> {
    return this.http.post<ExamTask>(`${this.base}/${id}/approve`, {});
  }

  cancel(id: number): Observable<ExamTask> {
    return this.http.post<ExamTask>(`${this.base}/${id}/cancel`, {});
  }

  update(id: number, body: Partial<ExamTaskCreateDTO>): Observable<ExamTask> {
    return this.http.put<ExamTask>(`${this.base}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  returnForRevision(taskId: number, reason: string) {
  // Đổi từ /api/tasks/... -> /api/exam-tasks/...
  return this.http.post<ExamTask>(`${this.base}/${taskId}/return`, { reason });
}
}
