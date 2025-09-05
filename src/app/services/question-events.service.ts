import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Question } from '../models/question';

export type QuestionEvent =
  | { subjectId: number; action: 'create' | 'update'; question: Question }
  | { subjectId: number; action: 'delete'; id: number };

@Injectable({ providedIn: 'root' })
export class QuestionEventsService {
  private _changed = new Subject<QuestionEvent>();
  changed$ = this._changed.asObservable();

  emit(e: QuestionEvent) { this._changed.next(e); }
}
