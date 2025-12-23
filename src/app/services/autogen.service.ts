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

export interface AutoGenRequest {
  variants?: number;
  steps?: any[];
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

  exportZipProgress(
    subjectId: number,
    body?: AutoGenRequest,
    query?: {
      commit?: boolean;
      merge?: boolean;
      fileName?: string;
      program?: string; // (Vẫn giữ để tương thích nếu cần, nhưng logic chính sẽ dùng faculty)
      semester?: string;
      academicYear?: string;
      classes?: string;
      duration?: string;
      examForm?: string;
      mau?: string;
      kind?: 'EXAM' | 'PRACTICE';
      // [NEW PARAMS]
      faculty?: string;     // Thay thế cho program cũ (Khoa)
      level?: string;       // Trình độ
      trainingType?: string; // Hình thức ĐT
    }
  ): Observable<HttpEvent<Blob>> {
    let params = new HttpParams().set('commit', String(query?.commit ?? true));
    if (query?.merge) params = params.set('merge', 'true');
    if (query?.fileName) params = params.set('fileName', query.fileName);
    
    // Logic cũ của bạn dùng `program` gửi lên BE nhưng thực tế đó là tên Khoa
    // Ở đây ta ưu tiên gửi `faculty` nếu có, nếu không thì fallback về `program`
    const fac = query?.faculty || query?.program;
    if (fac) params = params.set('faculty', fac); // Backend sẽ đổi @RequestParam thành 'faculty'
    
    // Nếu BE vẫn dùng tham số 'program' để hứng tên Bộ môn, thì bạn cần thêm param đó riêng
    // Tuy nhiên theo logic Header mới, ta có: Institute, Faculty, Program (Bộ môn)
    // Ở FE Dialog bạn đang map: faculty -> Faculty, program -> Program.
    // Nên tốt nhất gửi cả 2:
    if (query?.program) params = params.set('program', query.program); // Bộ môn
    
    if (query?.semester) params = params.set('semester', query.semester);
    if (query?.academicYear) params = params.set('academicYear', query.academicYear);
    if (query?.classes) params = params.set('classes', query.classes);
    if (query?.duration) params = params.set('duration', query.duration);
    if (query?.examForm) params = params.set('examForm', query.examForm);
    if (query?.mau) params = params.set('mau', query.mau);
    if (query?.kind) params = params.set('kind', query.kind);
    
    // [NEW] Gửi thêm params mới
    if (query?.level) params = params.set('level', query.level);
    if (query?.trainingType) params = params.set('trainingType', query.trainingType);

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