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

/** Kiểu trang Spring Data */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;     // index trang hiện tại
  size: number;       // kích thước trang
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

/** Tham số filter/list cho API phân trang */
export type QuestionTypeBE = 'MULTIPLE_CHOICE' | 'ESSAY';
export type DifficultyBE = 'A' | 'B' | 'C' | 'D' | 'E';
export type LabelBE = 'PRACTICE' | 'EXAM';

export interface QuestionListOpts {
  // server-side filters
  labels?: LabelBE[];
  q?: string;
  difficulty?: DifficultyBE;
  chapter?: number | null;
  type?: QuestionTypeBE;
  createdBy?: string;
  from?: Date | string | null; // ISO string hoặc Date
  to?: Date | string | null;   // ISO string hoặc Date

  // paging/sorting
  page?: number;               // default 0
  size?: number;               // default 20
  sort?: string;               // ví dụ 'createdAt,desc' hoặc 'createdAt,desc;id,desc'
}

/** ===== NEW: Bulk selection payload (IDS | FILTER) ===== */
export type BulkSelectionMode = 'IDS' | 'FILTER';
export interface BulkSelectionRequest {
  mode: BulkSelectionMode;
  /** Khi mode = IDS */
  ids?: number[];
  /** Khi mode = FILTER */
  filter?: QuestionListOpts;
  excludeIds?: number[];
}

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

  // ========= NEW: SERVER-SIDE PAGINATION + FILTER =========

  /** Lấy danh sách câu hỏi theo trang + filter (BE xử lý) */
  getQuestionsPage(subjectId: number, opts?: QuestionListOpts): Observable<Page<Question>> {
    let params = new HttpParams();

    // filters
    if (opts?.labels?.length) params = params.set('labels', opts.labels.join(','));
    if (opts?.q?.trim()) params = params.set('q', opts.q.trim());
    if (opts?.difficulty) params = params.set('difficulty', opts.difficulty);
    if (opts?.chapter != null) params = params.set('chapter', String(opts.chapter));
    if (opts?.type) params = params.set('type', opts.type);
    if (opts?.createdBy?.trim()) params = params.set('createdBy', opts.createdBy.trim());

    const iso = (v: Date | string | null | undefined): string | null => {
      if (!v) return null;
      if (v instanceof Date) return v.toISOString();
      try {
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d.toISOString();
      } catch { return null; }
    };
    const fromIso = iso(opts?.from);
    const toIso = iso(opts?.to);
    if (fromIso) params = params.set('from', fromIso);
    if (toIso) params = params.set('to', toIso);

    // paging/sorting
    params = params.set('page', String(opts?.page ?? 0));
    params = params.set('size', String(opts?.size ?? 20));
    if (opts?.sort) {
      // hỗ trợ nhiều sort phân tách bởi ;
      for (const s of opts.sort.split(';')) params = params.append('sort', s);
    } else {
      params = params.append('sort', 'createdAt,desc');
    }

    return this.http.get<Page<Question>>(
      `${baseUrl}/subject/${subjectId}/questions`,
      { params }
    );
  }

  /** Lấy clones theo trang (BE xử lý) */
  getClonesPage(subjectId: number, parentId: number, opts?: { page?: number; size?: number; sort?: string }): Observable<Page<Question>> {
    let params = new HttpParams();
    params = params.set('page', String(opts?.page ?? 0));
    params = params.set('size', String(opts?.size ?? 20));
    params = params.set('sort', opts?.sort || 'cloneIndex,asc');

    return this.http.get<Page<Question>>(
      `${baseUrl}/subject/${subjectId}/questions/${parentId}/clones`,
      { params }
    );
  }

  // ========= QUESTIONS CRUD/LIST =========

  getQuestion(subjectId: number, questionId: number): Observable<Question> {
    return this.http.get<Question>(`${baseUrl}/subject/${subjectId}/questions/${questionId}`);
  }

  /**
   * @deprecated FE nên chuyển sang getQuestionsPage(...) để phân trang server-side + filter.
   * Hàm này vẫn giữ để tạm tương thích — gọi endpoint mới với page=0,size=1000 (hoặc số bạn muốn).
   */
  getQuestionsBySubject(subjectId: number, labels?: LabelBE[]): Observable<Question[]> {
    const pageSizeFallback = 1000; // tránh tải “toàn bộ” nếu data lớn
    let params = new HttpParams().set('page', '0').set('size', String(pageSizeFallback)).append('sort', 'createdAt,desc');
    if (labels?.length) params = params.set('labels', labels.join(','));
    return this.http
      .get<Page<Question>>(`${baseUrl}/subject/${subjectId}/questions`, { params })
      .pipe(map(p => p.content || []));
  }

  createQuestion(subjectId: number, payload: CreateQuestion, images?: File[] | null) {
    const form = new FormData();
    form.append('question', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    if (images && images.length) images.forEach(f => form.append('images', f)); // ONLY images[]
    return this.http.post<Question>(`${baseUrl}/subject/${subjectId}/questions`, form);
  }

  updateQuestion(subjectId: number, questionId: number, payload: CreateQuestion, images?: File[] | null) {
    const form = new FormData();
    form.append('question', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    if (images) images.forEach(f => form.append('images', f));
    return this.http.put<Question>(`${baseUrl}/subject/${subjectId}/questions/${questionId}`, form);
  }

  /** Trả boolean để bulk-delete ở FE phân biệt OK/Fail chắc chắn (204 cũng nhận OK) */
  deleteQuestion(subjectId: number, questionId: number): Observable<boolean> {
    return this.http
      .delete<void>(`${baseUrl}/subject/${subjectId}/questions/${questionId}`, { observe: 'response' })
      .pipe(map((resp) => resp.ok));
  }

  importPreview(
    subjectId: number,
    file: File,
    saveCopy = false,
    labels?: LabelBE[]
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
        questionType: QuestionTypeBE;
        content: string;
        optionA?: string; optionB?: string; optionC?: string; optionD?: string;
        answer?: string; answerText?: string;
        imageIndexes?: number[];
        warnings?: string[];
        labels?: LabelBE[];
      }>;
    }>(`${baseUrl}/subject/${subjectId}/questions/preview`, form, { params });
  }

  importPreviewProgress(
    subjectId: number,
    file: File,
    saveCopy = false,
    labels?: LabelBE[]
  ): Observable<HttpEvent<any>> {
    const url = `${baseUrl}/subject/${subjectId}/questions/preview`;
    const form = new FormData();
    form.append('file', file);
    let params = new HttpParams().set('saveCopy', String(!!saveCopy));
    if (labels?.length) params = params.set('labels', labels.join(','));

    const req = new HttpRequest('POST', url, form, { reportProgress: true, params });
    return this.xhrClient.request(this.withAuth(req));
  }

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

  private buildExportParams(opts: ExportOptions): HttpParams {
    let params = new HttpParams()
      .set('format', opts.format)
      .set('includeAnswers', String(!!opts.includeAnswers))
      .set('fileName', String(opts.fileName ?? 'file'))
      .set('variant', opts.variant);

    if (opts.variant === 'practice') {
      if ((opts as any).saveCopy) params = params.set('saveCopy', 'true');
      params = params.set('form', opts.form ?? 'TU_LUAN')
        .set('level', opts.level ?? 'Đại học chính quy');
    } else {
      const duration = (opts as any).durationMinutes ? `${(opts as any).durationMinutes} phút` : (opts as any).duration;
      if (opts.semester) params = params.set('semester', opts.semester);
      if (opts.academicYear) params = params.set('academicYear', opts.academicYear);
      if (opts.classes) params = params.set('classes', opts.classes);
      if (duration) params = params.set('duration', duration);
      if (opts.paperNo != null) params = params.set('paperNo', String(opts.paperNo));
      if (opts.examForm) params = params.set('examForm', opts.examForm);
      if (opts.program) params = params.set('program', opts.program);
      if ((opts as any).mau) params = params.set('mau', (opts as any).mau);
      params = params.set('level', opts.level ?? 'Đại học chính quy');
    }
    return params;
  }

  exportQuestionsBySelection(
    subjectId: number,
    selection: BulkSelectionRequest,
    opts: ExportOptions
  ): Observable<HttpResponse<Blob>> {
    const params = this.buildExportParams(opts);
    return this.http.post<Blob>(
      `${baseUrl}/subject/${subjectId}/questions/export`,
      selection,
      { params, responseType: 'blob' as 'json', observe: 'response' }
    );
  }

  exportQuestionsProgressBySelection(
    subjectId: number,
    selection: BulkSelectionRequest,
    opts: ExportOptions
  ): Observable<HttpEvent<Blob>> {
    const params = this.buildExportParams(opts);
    const url = `${baseUrl}/subject/${subjectId}/questions/export`;
    const req = new HttpRequest('POST', url, selection, {
      reportProgress: true,
      responseType: 'blob' as any,
      params,
    });
    return this.xhrClient.request(this.withAuth(req));
  }

  exportQuestions(
    subjectId: number,
    questionIds: number[],
    opts: ExportOptions
  ): Observable<HttpResponse<Blob>> {
    const selection: BulkSelectionRequest = { mode: 'IDS', ids: questionIds ?? [] };
    return this.exportQuestionsBySelection(subjectId, selection, opts);
  }

  exportQuestionsProgress(
    subjectId: number,
    questionIds: number[],
    opts: ExportOptions
  ): Observable<HttpEvent<Blob>> {
    const selection: BulkSelectionRequest = { mode: 'IDS', ids: questionIds ?? [] };
    return this.exportQuestionsProgressBySelection(subjectId, selection, opts);
  }

  deleteBySelection(
    subjectId: number,
    selection: BulkSelectionRequest
  ): Observable<{ deleted: number; requested: number }> {
    return this.http.post<{ deleted: number; requested: number }>(
      `${baseUrl}/subject/${subjectId}/questions/bulk-delete`,
      selection
    );
  }

  cloneQuestion(subjectId: number, questionId: number, req: CloneRequest) {
    return this.http.post<Question[]>(`${baseUrl}/subject/${subjectId}/questions/${questionId}/clone`, req);
  }

  getClones(subjectId: number, parentId: number) {
    let params = new HttpParams().set('page', '0').set('size', '100').set('sort', 'cloneIndex,asc');
    return this.http
      .get<Page<Question>>(`${baseUrl}/subject/${subjectId}/questions/${parentId}/clones`, { params })
      .pipe(map(p => p.content || []));
  }
}
