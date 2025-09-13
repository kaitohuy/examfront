import { Component, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { sharedImports } from '../../../shared/shared-imports';
import { QuestionService } from '../../../services/question.service';
import { CreateQuestion } from '../../../models/createQuestion';
import { FormGroup } from '@angular/forms';
import { QuestionFormComponent } from '../question-form/question-form.component';
import { QuestionEventsService } from '../../../services/question-events.service';

import { LoadingScreenComponent } from '../../loading-screen/loading-screen.component';
import { withLoading } from '../../../shared/with-loading';

@Component({
  selector: 'app-question-edit-dialog',
  standalone: true,
  imports: [MatDialogModule, QuestionFormComponent, ...sharedImports, LoadingScreenComponent],
  templateUrl: './question-edit-dialog.component.html',
  styles: [`.muted{color:#6c757d;font-size:12px;}`]
})
export class QuestionEditDialogComponent {
  private form!: FormGroup;
  imageFile: File | null = null;

  /** Overlay loading */
  isLoading = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { subjectId: number; mode: 'create' | 'edit'; question?: any },
    private ref: MatDialogRef<QuestionEditDialogComponent>,
    private qs: QuestionService,
    private qevents: QuestionEventsService
  ) { }

  captureForm(f: FormGroup) { this.form = f; }
  onImagePicked(ev: Event) { this.imageFile = (ev.target as HTMLInputElement).files?.[0] || null; }

  @ViewChild(QuestionFormComponent) formComp!: QuestionFormComponent;

  save() {
    const f = this.formComp['form'] as FormGroup;
    if (!f || f.invalid) { f?.markAllAsTouched(); return; }

    const payload: CreateQuestion = this.formComp.toPayload();

    const req$ = this.data.mode === 'create'
      ? this.qs.createQuestion(this.data.subjectId, payload, this.imageFile)
      : this.qs.updateQuestion(this.data.subjectId, this.data.question!.id, payload, this.imageFile);

    req$
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: (q) => {
          this.qevents.emit({
            subjectId: this.data.subjectId,
            action: this.data.mode === 'create' ? 'create' : 'update',
            question: q
          });
          this.ref.close(q);
        },
        error: () => this.ref.close(null)
      });
  }
}
