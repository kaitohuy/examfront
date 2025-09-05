import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import baseUrl from './helper';
import { Quiz } from '../models/quiz';
import { CreateQuiz } from '../models/createQuiz';
import { AddQuizQuestion } from '../models/addQuizQuestion';
import { Question } from '../models/question';
import { AddQuizQuestions } from '../models/addQuizQuestions';
import { QuizQuestion } from '../models/quizQuestion';
import { QuestionType } from '../models/questionType';
import { Difficulty } from '../models/difficulty';

@Injectable({
  providedIn: 'root'
})
export class QuizService {

  constructor(private _http: HttpClient) { }

  // Lấy tất cả quiz theo môn học
  listQuizzes(subjectId: number): Observable<Quiz[]> {
    return this._http.get<Quiz[]>(`${baseUrl}/subject/${subjectId}/quizzes`);
  }

  // Lấy chi tiết quiz
  getQuiz(subjectId: number, quizId: number): Observable<Quiz> {
    return this._http.get<Quiz>(`${baseUrl}/subject/${subjectId}/quizzes/${quizId}`);
  }

  // Tạo quiz mới
  createQuiz(subjectId: number, payload: CreateQuiz): Observable<Quiz> {
    return this._http.post<Quiz>(
      `${baseUrl}/subject/${subjectId}/quizzes`,
      payload
    );
  }

  // Cập nhật thông tin quiz
  updateQuiz(subjectId: number, quizId: number, payload: CreateQuiz): Observable<Quiz> {
    return this._http.put<Quiz>(
      `${baseUrl}/subject/${subjectId}/quizzes/${quizId}`,
      payload
    );
  }

  // Cập nhật danh sách câu hỏi (thay thế toàn bộ)
  updateQuizQuestions(
    subjectId: number,
    quizId: number,
    questions: AddQuizQuestion[]
  ): Observable<Quiz> {
    return this._http.put<Quiz>(
      `${baseUrl}/subject/${subjectId}/quizzes/${quizId}/questions`,
      questions
    );
  }

  // Xóa quiz
  deleteQuiz(subjectId: number, quizId: number): Observable<void> {
    return this._http.delete<void>(
      `${baseUrl}/subject/${subjectId}/quizzes/${quizId}`
    );
  }

  // Lấy danh sách câu hỏi trong quiz
  listQuizQuestions(subjectId: number, quizId: number): Observable<Question[]> {
    return this._http.get<Question[]>(
      `${baseUrl}/subject/${subjectId}/quizzes/${quizId}/questions`
    );
  }

  // Thêm câu hỏi vào quiz
  addQuestionsToQuiz(
    subjectId: number,
    quizId: number,
    payload: AddQuizQuestions
  ): Observable<QuizQuestion[]> {
    return this._http.post<QuizQuestion[]>(
      `${baseUrl}/subject/${subjectId}/quizzes/${quizId}/questions`,
      payload
    );
  }

  // Xóa câu hỏi khỏi quiz
  removeQuestionFromQuiz(
    subjectId: number,
    quizId: number,
    questionId: number
  ): Observable<void> {
    return this._http.delete<void>(
      `${baseUrl}/subject/${subjectId}/quizzes/${quizId}/questions/${questionId}`
    );
  }

  // Xuất quiz (PDF/Word)
  exportQuiz(
    subjectId: number,
    quizId: number,
    includeAnswers: boolean = false,
    format: string = 'pdf'
  ): Observable<Blob> {
    const params = {
      includeAnswers: includeAnswers.toString(),
      format
    };

    return this._http.get(
      `${baseUrl}/subject/${subjectId}/quizzes/${quizId}/export`,
      {
        params,
        responseType: 'blob'
      }
    );
  }

  // Thêm vào quiz.service.ts
  getQuestionTypeLabel(type: QuestionType): string {
    return type === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : 'Tự luận';
  }

  getDifficultyLabel(difficulty: Difficulty): string {
    switch (difficulty) {
      case 'A': return 'A';
      case 'B': return 'B';
      case 'C': return 'C';
      case 'D': return 'D';
      case 'E': return 'E';
      default: return difficulty;
    }
  }
}