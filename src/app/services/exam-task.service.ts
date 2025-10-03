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
    from?: string;  // yyyy-MM-dd
    to?: string;    // yyyy-MM-dd
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

  updateStatus(id: number, status: ExamTaskStatus): Observable<ExamTask> {
    const payload: ExamTaskUpdateStatusDTO = { status };
    return this.http.post<ExamTask>(`${this.base}/${id}/status`, payload);
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
}
