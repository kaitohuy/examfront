import { Component, Input } from '@angular/core';
import { QuestionComponent } from '../question/question.component';

@Component({
  selector: 'app-practice-question-tab',
  standalone: true,
  imports: [QuestionComponent],
  template: `<app-question
      [subjectId]="subjectId"
      [departmentId]="departmentId"
      [labelFilter]="'PRACTICE'"
      [requireHeadForAnswers]="false"></app-question>`
})
export class PracticeQuestionTabComponent {
  @Input() subjectId!: number;
  @Input() departmentId!: number;
}
