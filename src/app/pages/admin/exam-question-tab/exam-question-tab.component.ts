import { Component, Input } from '@angular/core';
import { QuestionComponent } from '../question/question.component';

@Component({
  selector: 'app-exam-question-tab',
  standalone: true,
  imports: [QuestionComponent],
  template: `<app-question
      [subjectId]="subjectId"
      [departmentId]="departmentId"
      [labelFilter]="'EXAM'"
      [requireHeadForAnswers]="true"></app-question>`
})
export class ExamQuestionTabComponent {
  @Input() subjectId!: number;
  @Input() departmentId!: number;
}
