import { Component, Inject, QueryList, ViewChildren } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { from, of, concatMap, catchError, toArray } from 'rxjs';

import { sharedImports } from '../../../shared/shared-imports';
import { QuestionFormComponent } from '../question-form/question-form.component';
import { QuestionService } from '../../../services/question.service';
import { CreateQuestion } from '../../../models/createQuestion';

import { LoadingScreenComponent } from '../../loading-screen/loading-screen.component';
import { withLoading } from '../../../shared/with-loading';

@Component({
  selector: 'app-clone-quick-edit-dialog',
  standalone: true,
  imports: [MatDialogModule, QuestionFormComponent, ...sharedImports, LoadingScreenComponent],
  templateUrl: './clone-quick-edit-dialog.component.html',
  styleUrls: ['./clone-quick-edit-dialog.component.css']
})
export class CloneQuickEditDialogComponent {
  @ViewChildren(QuestionFormComponent) forms!: QueryList<QuestionFormComponent>;

  isLoading = false;
  clones: any[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { subjectId: number; clones: any[] },
    public ref: MatDialogRef<CloneQuickEditDialogComponent>,
    private qs: QuestionService,
    private snack: MatSnackBar
  ) {
    // xoá đáp án mặc định để buộc user điền
    this.clones = (data?.clones || []).map(c => ({
      ...c,
      answer: c.questionType === 'MULTIPLE_CHOICE' ? '' : c.answer,
      answerText: c.questionType === 'ESSAY' ? '' : c.answerText
    }));
  }

  saveAll() {
    const items = this.forms?.toArray() ?? [];

    // validate tất cả form trước khi gửi
    for (const comp of items) {
      const f = (comp as any).form as any;
      if (!f || f.invalid) {
        f?.markAllAsTouched();
        this.snack.open('Vui lòng điền đầy đủ các trường bắt buộc.', 'Đóng', {
          duration: 3000,
          verticalPosition: 'top',
          horizontalPosition: 'right',
          panelClass: ['snack', 'snack-error'],
        });
        return;
      }
    }

    const payloads = items.map((comp, i) => ({
      id: this.clones[i].id as number,
      payload: comp.toPayload() as CreateQuestion
    }));

    from(payloads).pipe(
      withLoading(v => this.isLoading = v),
      // cập nhật tuần tự từng bản sao
      concatMap(({ id, payload }) =>
        this.qs.updateQuestion(this.data.subjectId, id, payload, null).pipe(
          catchError(err => {
            // bỏ qua lỗi để tiếp tục các bản còn lại
            console.error('Update clone failed:', id, err);
            return of(null);
          })
        )
      ),
      toArray()
    ).subscribe({
      next: (arr) => {
        const results = arr.filter(x => x != null);
        if (results.length < payloads.length) {
          this.snack.open('Một số bản sao lưu không thành công.', 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error'] });
        } else {
          this.snack.open('Đã lưu tất cả bản sao.', 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-success'] });
        }
        this.ref.close(results);
      },
      error: (err) => {
        console.error(err);
        this.snack.open('Có lỗi khi lưu các bản sao.', 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error'] });
      }
    });
  }
}
