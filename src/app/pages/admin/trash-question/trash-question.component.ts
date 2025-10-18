import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { Subscription } from 'rxjs';
import { QuestionComponent } from '../question/question.component';
import { sharedImports } from '../../../shared/shared-imports';

@Component({
  selector: 'app-trash-question-tab',
  standalone: true,
  imports: [
      ...sharedImports,
      QuestionComponent
    ],
  template: `
    <!-- Chỉ render QuestionComponent khi đã có subjectId -->
    <ng-container *ngIf="subjectIdReady; else missing">
      <app-question
        [subjectId]="subjectId!"
        [departmentId]="departmentId"
        [labelFilter]="'ALL'"
        [requireHeadForAnswers]="true"
        [trashMode]="true">
      </app-question>
    </ng-container>

    <ng-template #missing>
      <div class="container py-4 text-danger">
        Thiếu subjectId trên URL.
      </div>
    </ng-template>
  `
})
export class TrashQuestionComponent implements OnInit, OnDestroy {
  subjectId!: number;
  departmentId?: number;
  subjectIdReady = false;

  private sub?: Subscription;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.sub = this.route.paramMap.subscribe((pm: ParamMap) => {
      const sidRaw = pm.get('subjectId');
      const depRaw = pm.get('departmentId');

      const sid = Number(sidRaw);
      this.subjectId = Number.isFinite(sid) ? sid : (undefined as any);

      if (depRaw != null) {
        const dep = Number(depRaw);
        this.departmentId = Number.isFinite(dep) ? dep : undefined;
      } else {
        this.departmentId = undefined; // đường TEACHER không có departmentId
      }

      this.subjectIdReady = typeof this.subjectId === 'number' && Number.isFinite(this.subjectId);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
