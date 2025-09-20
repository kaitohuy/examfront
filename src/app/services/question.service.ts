// src/app/services/question.service.ts
import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpParams,
  HttpResponse,
  HttpRequest,
  HttpEvent,
  HttpXhrBackend,
  HttpHeaders,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import baseUrl from './helper';
import { Question } from '../models/question';
import { CreateQuestion } from '../models/createQuestion';
import { ExportOptions } from '../models/exportOptions';
import { CloneRequest } from '../models/CloneRequest';
import { LoginService } from './login.service';

@Injectable({ providedIn: 'root' })
export class QuestionService {

  constructor(private http: HttpClient, private login: LoginService) { }

  private xhrBackend = inject(HttpXhrBackend, { optional: true });
  private xhrClient = this.xhrBackend ? new HttpClient(this.xhrBackend) : this.http;
  
  private withAuth<T>(req: HttpRequest<T>): HttpRequest<T> {
    const token = this.login.getToken?.();
    if (!token) return req;
    const headers: HttpHeaders = (req.headers || new HttpHeaders()).set('Authorization', `Bearer ${token}`);
    return req.clone({ headers });
  }

  // ======= QUESTIONS CRUD/LIST =======

  getQuestion(subjectId: number, questionId: number): Observable<Question> {
    return this.http.get<Question>(`${baseUrl}/subject/${subjectId}/questions/${questionId}`);
  }

  getQuestionsBySubject(subjectId: number, labels?: ('PRACTICE' | 'EXAM')[]): Observable<Question[]> {
    let params = new HttpParams();
    if (labels?.length) params = params.set('labels', labels.join(','));
    return this.http.get<Question[]>(`${baseUrl}/subject/${subjectId}/questions`, { params });
  }

  createQuestion(subjectId: number, payload: CreateQuestion, image: File | null) {
    const form = new FormData();
    form.append('question', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    if (image) form.append('image', image, image.name);
    return this.http.post<Question>(`${baseUrl}/subject/${subjectId}/questions`, form);
  }

  updateQuestion(subjectId: number, questionId: number, payload: CreateQuestion, image: File | null) {
    const form = new FormData();
    form.append('question', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    if (image) form.append('image', image, image.name);
    return this.http.put<Question>(`${baseUrl}/subject/${subjectId}/questions/${questionId}`, form);
  }

  /** Trả boolean để bulk-delete ở FE phân biệt OK/Fail chắc chắn (204 cũng nhận OK) */
  deleteQuestion(subjectId: number, questionId: number): Observable<boolean> {
    return this.http
      .delete<void>(`${baseUrl}/subject/${subjectId}/questions/${questionId}`, { observe: 'response' })
      .pipe(map((resp) => resp.ok));
  }

  // ======= IMPORT PREVIEW =======

  /** Preview (không cần progress) — dùng fetch client mặc định */
  importPreview(
    subjectId: number,
    file: File,
    saveCopy = false,
    labels?: ('PRACTICE' | 'EXAM')[]
  ) {
    const form = new FormData();
    form.append('file', file);
    let params = new HttpParams().set('saveCopy', String(!!saveCopy));
    if (labels?.length) params = params.set('labels', labels.join(','));
    return this.http.post<{
      sessionId: string;
      totalBlocks: number;
      blocks: Array<{
        index: number;
        questionType: 'MULTIPLE_CHOICE' | 'ESSAY';
        content: string;
        optionA?: string; optionB?: string; optionC?: string; optionD?: string;
        answer?: string; answerText?: string;
        imageIndexes?: number[];
        warnings?: string[];
        labels?: ('PRACTICE' | 'EXAM')[];
      }>;
    }>(`${baseUrl}/subject/${subjectId}/questions/preview`, form, { params });
  }

  /** Preview (CÓ progress) — dùng xhrClient + withAuth */
  importPreviewProgress(
    subjectId: number,
    file: File,
    saveCopy = false,
    labels?: ('PRACTICE' | 'EXAM')[]
  ): Observable<HttpEvent<any>> {
    const url = `${baseUrl}/subject/${subjectId}/questions/preview`;
    const form = new FormData();
    form.append('file', file);
    let params = new HttpParams().set('saveCopy', String(!!saveCopy));
    if (labels?.length) params = params.set('labels', labels.join(','));

    const req = new HttpRequest('POST', url, form, { reportProgress: true, params });
    return this.xhrClient.request(this.withAuth(req));
  }

  // ======= IMPORT COMMIT =======

  /** Commit (không cần progress) — dùng fetch client mặc định */
  importCommit(
    subjectId: number,
    payload: { sessionId: string; blocks: Array<{ index: number; include: boolean }> },
    saveCopy = false
  ) {
    return this.http.post<{ total: number; success: number; errors: string[] }>(
      `${baseUrl}/subject/${subjectId}/questions/commit?saveCopy=${saveCopy}`,
      payload
    );
  }

  /** Commit (CÓ progress) — dùng xhrClient + withAuth */
  importCommitProgress(
    subjectId: number,
    payload: { sessionId: string; blocks: Array<{ index: number; include: boolean }> },
    saveCopy = false
  ): Observable<HttpEvent<any>> {
    const url = `${baseUrl}/subject/${subjectId}/questions/commit`;
    const params = new HttpParams().set('saveCopy', String(!!saveCopy));
    const req = new HttpRequest('POST', url, payload, {
      reportProgress: true,
      responseType: 'json',
      params,
    });
    return this.xhrClient.request(this.withAuth(req));
  }

  // ======= EXPORT =======

  /** Export (không cần progress) — dùng fetch client mặc định để lấy content-disposition */
  exportQuestions(
    subjectId: number,
    questionIds: number[],
    opts: ExportOptions
  ): Observable<HttpResponse<Blob>> {
    let params = new HttpParams()
      .set('format', opts.format)
      .set('includeAnswers', String(!!opts.includeAnswers))
      .set('fileName', String(opts.fileName ?? 'file'))
      .set('variant', opts.variant);

    if (opts.variant === 'practice') {
      if (opts.saveCopy) params = params.set('saveCopy', 'true');
      params = params.set('form', opts.form ?? 'TU_LUAN')
        .set('level', opts.level ?? 'Đại học chính quy');
    } else {
      const duration = opts.durationMinutes ? `${opts.durationMinutes} phút` : undefined;
      if (opts.semester) params = params.set('semester', opts.semester);
      if (opts.academicYear) params = params.set('academicYear', opts.academicYear);
      if (opts.classes) params = params.set('classes', opts.classes);
      if (duration) params = params.set('duration', duration);
      if (opts.paperNo != null) params = params.set('paperNo', String(opts.paperNo));
      if (opts.examForm) params = params.set('examForm', opts.examForm);
      if (opts.program) params = params.set('program', opts.program);
      if (opts.mau) params = params.set('mau', opts.mau);
      params = params.set('level', opts.level ?? 'Đại học chính quy');
    }

    return this.http.post<Blob>(
      `${baseUrl}/subject/${subjectId}/questions/export`,
      questionIds,
      { params, responseType: 'blob' as 'json', observe: 'response' }
    );
  }

  /** Export (CÓ progress) — dùng xhrClient + withAuth */
  exportQuestionsProgress(
    subjectId: number,
    questionIds: number[],
    opts: ExportOptions
  ): Observable<HttpEvent<Blob>> {
    let params = new HttpParams()
      .set('format', opts.format)
      .set('includeAnswers', String(!!opts.includeAnswers))
      .set('fileName', String(opts.fileName ?? 'file'))
      .set('variant', opts.variant);

    if (opts.variant === 'practice') {
      if (opts.saveCopy) params = params.set('saveCopy', 'true');
      params = params.set('form', opts.form ?? 'TU_LUAN')
        .set('level', opts.level ?? 'Đại học chính quy');
    } else {
      const duration = opts.durationMinutes ? `${opts.durationMinutes} phút` : undefined;
      if (opts.semester) params = params.set('semester', opts.semester);
      if (opts.academicYear) params = params.set('academicYear', opts.academicYear);
      if (opts.classes) params = params.set('classes', opts.classes);
      if (duration) params = params.set('duration', duration);
      if (opts.paperNo != null) params = params.set('paperNo', String(opts.paperNo));
      if (opts.examForm) params = params.set('examForm', opts.examForm);
      if (opts.program) params = params.set('program', opts.program);
      if (opts.mau) params = params.set('mau', opts.mau);
      params = params.set('level', opts.level ?? 'Đại học chính quy');
    }

    const url = `${baseUrl}/subject/${subjectId}/questions/export`;
    const req = new HttpRequest('POST', url, questionIds, {
      reportProgress: true,
      responseType: 'blob' as any,
      params,
    });
    return this.xhrClient.request(this.withAuth(req));
  }

  // ======= CLONES =======

  cloneQuestion(subjectId: number, questionId: number, req: CloneRequest) {
    return this.http.post<Question[]>(`${baseUrl}/subject/${subjectId}/questions/${questionId}/clone`, req);
  }

  getClones(subjectId: number, parentId: number) {
    return this.http.get<Question[]>(`${baseUrl}/subject/${subjectId}/questions/${parentId}/clones`);
  }
}
