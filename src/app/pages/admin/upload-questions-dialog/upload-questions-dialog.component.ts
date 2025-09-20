import { Component, computed, ElementRef, Inject, signal, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DialogData } from '../../../models/dialogData';
import { sharedImports } from '../../../shared/shared-imports';
import { UploadDialogConfig } from '../../../models/uploadDialogConfig';

@Component({
  selector: 'app-upload-questions-dialog',
  standalone: true,
  imports: [
    ...sharedImports
  ],
  templateUrl: './upload-questions-dialog.component.html',
  styleUrl: './upload-questions-dialog.component.css'
})
export class UploadQuestionsDialogComponent {
  // Lấy config
  constructor(
    private ref: MatDialogRef<UploadQuestionsDialogComponent, { file: File; saveCopy: boolean }>,
    @Inject(MAT_DIALOG_DATA) public data: UploadDialogConfig   // dùng interface mới
  ) {}

  // NEW: trỏ tới input file trong template (#fileInput)
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  accept = this.data.accept ?? '.docx,.pdf';
  maxSizeMb = this.data.maxSizeMb ?? 20;
  saveCopy = this.data.defaultSaveCopy ?? false;

  private _file = signal<File | null>(null);
  file = computed(() => this._file());
  dragging = signal(false);
  error = signal<string | null>(null);

  // NEW: mở hộp chọn file
  browse() {
    this.fileInput?.nativeElement.click();
  }

  onKey(ev: KeyboardEvent) {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); this.browse(); }
  }

  onPick(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0] || null;
    if (f) this.setFile(f);
  }

  onDrag(on: boolean, e: Event) { e.preventDefault(); this.dragging.set(on); }
  onDrop(e: DragEvent) {
    e.preventDefault(); this.dragging.set(false);
    const f = e.dataTransfer?.files?.[0] || null;
    if (f) this.setFile(f);
  }

  setFile(f: File) {
    this.error.set(null);
    const acceptRe = new RegExp(`(${this.accept.replace(/\./g, '\\.').replace(/,/g, '|')})$`, 'i');
    if (!acceptRe.test(f.name)) { this.error.set('Định dạng không hợp lệ'); return; }
    if (f.size > this.maxSizeMb * 1024 * 1024) { this.error.set(`Kích thước vượt ${this.maxSizeMb}MB`); return; }
    this._file.set(f);
  }

  clear() { this._file.set(null); this.error.set(null); if (this.fileInput) this.fileInput.nativeElement.value = ''; }

  isPdf() { return /\.pdf$/i.test(this._file()?.name || ''); }
  fileTypeLabel() { return this.isPdf() ? 'PDF' : 'Microsoft Word'; }
  canSubmit() { return !!this._file() && !this.error(); }

  submit() { if (this.canSubmit()) this.ref.close({ file: this._file()!, saveCopy: this.saveCopy }); }
  close() { this.ref.close(); }
}