import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import baseUrl from './helper';
import { Question } from '../models/question';
import { CreateQuestion } from '../models/createQuestion';
import { ExportOptions } from '../models/exportOptions';
import { CloneRequest } from '../models/CloneRequest';

@Injectable({
  providedIn: 'root'
})
export class QuestionService {

  constructor(
    private http: HttpClient,
  ) { }

  getQuestion(subjectId: number, questionId: number): Observable<Question> {
    return this.http.get<Question>(
      `${baseUrl}/subject/${subjectId}/questions/${questionId}`
    );
  }

  // Lấy tất cả câu hỏi của môn học
  getQuestionsBySubject(subjectId: number, labels?: ('PRACTICE' | 'EXAM')[]): Observable<Question[]> {
    let params = new HttpParams();
    if (labels && labels.length) {
      // BE nhận Set<QuestionLabel> từ query param 'labels=PRACTICE,EXAM'
      params = params.set('labels', labels.join(','));
    }
    return this.http.get<Question[]>(
      `${baseUrl}/subject/${subjectId}/questions`, { params }
    );
  }

  // Tạo câu hỏi mới với ảnh
  createQuestion(subjectId: number, payload: CreateQuestion, image: File | null) {
    const form = new FormData();
    const json = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    form.append('question', json);
    if (image) form.append('image', image, image.name);
    return this.http.post<Question>(`${baseUrl}/subject/${subjectId}/questions`, form);
  }

  updateQuestion(subjectId: number, questionId: number, payload: CreateQuestion, image: File | null) {
    const form = new FormData();
    const json = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    form.append('question', json);
    if (image) form.append('image', image, image.name);
    return this.http.put<Question>(`${baseUrl}/subject/${subjectId}/questions/${questionId}`, form);
  }

  // Xóa câu hỏi
  deleteQuestion(subjectId: number, questionId: number): Observable<void> {
    return this.http.delete<void>(
      `${baseUrl}/subject/${subjectId}/questions/${questionId}`
    );
  }

  // ---- IMPORT ----
  importPreview(subjectId: number, file: File, saveCopy = false, labels?: ('PRACTICE' | 'EXAM')[]) {
    const form = new FormData();
    form.append('file', file);

    let params = new HttpParams().set('saveCopy', String(!!saveCopy));
    if (labels && labels.length) {
      params = params.set('labels', labels.join(',')); // PRACTICE hoặc PRACTICE,EXAM
    }

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
        /** 🔹 mới */
        labels?: ('PRACTICE' | 'EXAM')[];
      }>;
    }>(
      `${baseUrl}/subject/${subjectId}/questions/preview`,
      form,
      { params }
    );
  }

  importCommit(
    subjectId: number,
    payload: { sessionId: string; blocks: Array<{ index: number; include: boolean }> },
    saveCopy = false
  ) {
    return this.http.post<{
      total: number; success: number; errors: string[];
    }>(`${baseUrl}/subject/${subjectId}/questions/commit?saveCopy=${saveCopy}`, payload);
  }

  // ---- EXPORT ----
  /**
   * PRACTICE: nếu opts.saveCopy === true -> lưu APPROVED; false -> chỉ tải về
   * EXAM: FE không gửi saveCopy; BE auto-save (HEAD/ADMIN: APPROVED, TEACHER: PENDING)
   */
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
      // PRACTICE: cho phép lưu (saveCopy)
      if (opts.saveCopy) params = params.set('saveCopy', 'true');
      params = params
        .set('form', opts.form ?? 'TU_LUAN')
        .set('level', opts.level ?? 'Đại học chính quy');
    } else {
      // EXAM headers (BE auto-save, bỏ saveCopy)
      const duration = opts.durationMinutes ? `${opts.durationMinutes} phút` : undefined;
      if (opts.semester)     params = params.set('semester', opts.semester);
      if (opts.academicYear) params = params.set('academicYear', opts.academicYear);
      if (opts.classes)      params = params.set('classes', opts.classes);
      if (duration)          params = params.set('duration', duration);
      if (opts.paperNo != null) params = params.set('paperNo', String(opts.paperNo));
      if (opts.examForm)     params = params.set('examForm', opts.examForm);
      if (opts.faculty)      params = params.set('faculty', opts.faculty);
      if (opts.mau)          params = params.set('mau', opts.mau);
      params = params.set('level', opts.level ?? 'Đại học chính quy');
    }

    return this.http.post<Blob>(
      `${baseUrl}/subject/${subjectId}/questions/export`,
      questionIds,
      { params, responseType: 'blob' as 'json', observe: 'response' }
    );
  }

  // ---- Clone ----
  cloneQuestion(subjectId: number, questionId: number, req: CloneRequest) {
    return this.http.post<Question[]>(
      `${baseUrl}/subject/${subjectId}/questions/${questionId}/clone`,
      req
    );
  }

  getClones(subjectId: number, parentId: number) {
    return this.http.get<Question[]>(
      `${baseUrl}/subject/${subjectId}/questions/${parentId}/clones`
    );
  }

}
