import { Component, Inject, QueryList, ViewChildren } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { sharedImports } from '../../../shared/shared-imports';
import { QuestionFormComponent } from '../question-form/question-form.component';
import { QuestionService } from '../../../services/question.service';
import { CreateQuestion } from '../../../models/createQuestion';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-clone-quick-edit-dialog',
  standalone: true,
  imports: [MatDialogModule, QuestionFormComponent, ...sharedImports],
  template: `
    <h2 mat-dialog-title>Sửa nhanh các bản sao</h2>
    <mat-dialog-content class="pt-0">
      <div class="muted mb-2">Điền đáp án cho mỗi câu; có thể chỉnh content, options...</div>
      <div class="grid" style="gap:12px">
        <div class="card p-3" *ngFor="let c of clones; let i = index">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <b>Bản sao #{{ c.parentId }}.{{ c.cloneIndex }}</b>
            <span class="badge text-bg-light">{{ c.questionType === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : 'Tự luận' }}</span>
          </div>
          <app-question-form [value]="c"></app-question-form>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button (click)="ref.close()">Để sau</button>
      <button mat-flat-button color="primary" (click)="saveAll()" [disabled]="saving">Lưu tất cả</button>
    </mat-dialog-actions>
  `,
  styles:[`.muted{color:#6c757d;font-size:12px;}`]
})
export class CloneQuickEditDialogComponent {
  @ViewChildren(QuestionFormComponent) forms!: QueryList<QuestionFormComponent>;
  saving = false;
  clones: any[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { subjectId:number; clones:any[] },
    public ref: MatDialogRef<CloneQuickEditDialogComponent>,
    private qs: QuestionService,
    private snack: MatSnackBar 
  ){
    // xoá đáp án mặc định để buộc user điền
    this.clones = (data?.clones || []).map(c => ({
      ...c,
      answer: c.questionType==='MULTIPLE_CHOICE' ? '' : c.answer,
      answerText: c.questionType==='ESSAY' ? '' : c.answerText
    }));
  }

  saveAll(){
    const items = this.forms.toArray();

    // validate
    for (const comp of items){
      const f = (comp as any).form as any;
      if (!f || f.invalid){
        f?.markAllAsTouched();
        this.snack.open('Vui lòng điền đầy đủ các trường bắt buộc.', 'Đóng', {
          duration: 3000, panelClass: ['error-snackbar']
        });
        return;
      }
    }

    this.saving = true;
    const results:any[] = [];
    const step = (i:number)=>{
      if (i>=items.length){
        this.saving=false;
        this.ref.close(results); // parent sẽ show snackbar “Đã lưu … bản sao.”
        return;
      }
      const comp = items[i];
      const payload: CreateQuestion = comp.toPayload();
      const id = this.clones[i].id;

      this.qs.updateQuestion(this.data.subjectId, id, payload, null).subscribe({
        next: (q)=>{ results.push(q); step(i+1); },
        error: ()=> { step(i+1); } // có thể gom lỗi chi tiết nếu muốn
      });
    };
    step(0);
  }
}
