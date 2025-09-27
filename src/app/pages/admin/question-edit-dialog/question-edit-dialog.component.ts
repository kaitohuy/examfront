import { Component, HostListener, Inject, OnDestroy, ViewChild } from '@angular/core';
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
  styleUrls: ['./question-edit-dialog.component.css'] 
})
export class QuestionEditDialogComponent implements OnDestroy {
  private form!: FormGroup;

  /** Ảnh người dùng vừa chọn (gallery mới) */
  imageFiles: File[] = [];
  imagePreviews: string[] = [];

  /** Overlay loading */
  isLoading = false;

  /** Lightbox state */
  zoomOpen = false;
  zoomIndex = 0;
  private prevDisableClose = false;

  get zoomUrl(): string {
    return this.imagePreviews[this.zoomIndex] ?? '';
  }

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { subjectId: number; mode: 'create' | 'edit'; question?: any },
    private ref: MatDialogRef<QuestionEditDialogComponent>,
    private qs: QuestionService,
    private qevents: QuestionEventsService
  ) { }

  @ViewChild(QuestionFormComponent) formComp!: QuestionFormComponent;

  captureForm(f: FormGroup) { this.form = f; }

  onImagesPicked(ev: Event) {
    const files = Array.from((ev.target as HTMLInputElement).files || []);
    if (!files.length) return;

    this.imageFiles = [...this.imageFiles, ...files];
    files.forEach(file => this.imagePreviews.push(URL.createObjectURL(file)));

    // Cho phép chọn lại cùng file lần sau
    (ev.target as HTMLInputElement).value = '';
  }

  removeImage(i: number) {
    this.imageFiles.splice(i, 1);
    URL.revokeObjectURL(this.imagePreviews[i]);
    this.imagePreviews.splice(i, 1);

    // nếu đang xem ảnh bị xoá → điều chỉnh lightbox
    if (this.zoomOpen) {
      if (this.imagePreviews.length === 0) this.closeZoom();
      else this.zoomIndex = Math.min(this.zoomIndex, this.imagePreviews.length - 1);
    }
  }

  /** Mở lightbox và chặn đóng dialog cha */
  openZoom(i: number, ev?: Event) {
    ev?.stopPropagation();
    if (!this.imagePreviews.length) return;
    this.zoomIndex = i;
    this.prevDisableClose = this.ref.disableClose ?? false;
    this.ref.disableClose = true;
    this.zoomOpen = true;
  }


  /** Đóng lightbox và khôi phục trạng thái đóng dialog */
  closeZoom(ev?: Event) {
    ev?.stopPropagation();
    this.zoomOpen = false;
    this.ref.disableClose = this.prevDisableClose ?? false;
  }

  next(ev?: Event) {
    ev?.stopPropagation();
    if (!this.imagePreviews.length) return;
    this.zoomIndex = (this.zoomIndex + 1) % this.imagePreviews.length;
  }

  prev(ev?: Event) {
    ev?.stopPropagation();
    if (!this.imagePreviews.length) return;
    this.zoomIndex = (this.zoomIndex - 1 + this.imagePreviews.length) % this.imagePreviews.length;
  }

  /** Ưu tiên Esc/←/→ cho lightbox, không cho “lọt” xuống dialog */
  @HostListener('document:keydown', ['$event'])
  onDocKey(e: KeyboardEvent) {
    if (!this.zoomOpen) return;
    if (['Escape', 'Esc', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape' || e.key === 'Esc') this.closeZoom();
      else if (e.key === 'ArrowRight') this.next();
      else if (e.key === 'ArrowLeft') this.prev();
    }
  }

  ngOnDestroy(): void {
    // dọn URL preview
    for (const u of this.imagePreviews) {
      try { URL.revokeObjectURL(u); } catch { }
    }
  }

  save() {
    const f = this.formComp['form'] as FormGroup;
    if (!f || f.invalid) { f?.markAllAsTouched(); return; }

    const payload: CreateQuestion = this.formComp.toPayload();

    // create: luôn gửi mảng (có thể rỗng)
    // edit:   nếu không chọn ảnh mới -> không gửi field images (undefined) để giữ nguyên gallery
    const imagesToSend =
      this.data.mode === 'edit'
        ? (this.imageFiles.length ? this.imageFiles : undefined)
        : this.imageFiles;

    const req$ = this.data.mode === 'create'
      ? this.qs.createQuestion(this.data.subjectId, payload, imagesToSend || null)
      : this.qs.updateQuestion(this.data.subjectId, this.data.question!.id, payload, imagesToSend as any);

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
