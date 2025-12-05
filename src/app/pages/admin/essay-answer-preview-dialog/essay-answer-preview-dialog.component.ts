import { Component, Inject, NgZone, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { HttpEventType } from '@angular/common/http';

import { sharedImports } from '../../../shared/shared-imports';
import { LoadingScreenComponent } from '../../loading-screen/loading-screen.component';
import { ToolMathComponent } from '../../../shared/tool-math/tool-math.component';
import { QuestionService } from '../../../services/question.service';
import {
  AnswerImportPreviewResponse,
  AnswerImportResult,
  AnswerUpdatePreviewBlockFE
} from '../../../models/answer-import.models';

import Swal from 'sweetalert2';

export interface EssayAnswerPreviewDialogData {
  subjectId: number;
  preview: AnswerImportPreviewResponse;
}

interface BlockVM extends AnswerUpdatePreviewBlockFE {
  /** Trạng thái UI */
  editing?: boolean;
}

type AnswerKey = string;

interface FocusedField {
  blockIndex: number;
  key: AnswerKey;
}

@Component({
  selector: 'app-essay-answer-preview-dialog',
  standalone: true,
  imports: [
    ...sharedImports,
    MatDialogModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatMenuModule,
    LoadingScreenComponent,
    ToolMathComponent
  ],
  templateUrl: './essay-answer-preview-dialog.component.html',
  styleUrls: ['./essay-answer-preview-dialog.component.css']
})
export class EssayAnswerPreviewDialogComponent implements OnDestroy {

  blocks: BlockVM[] = [];
  totalBlocks = 0;

  isSaving = false;
  commitProgress: number | null = null;

  private rafId = 0;
  private rampStart = 0;
  private rampDuration = 2500;
  private rampTarget = 95;

  /** Ô đáp án mới đang focus (để tool Math chèn TeX) */
  private focused: FocusedField | null = null;
  private questionCodeMap = new Map<number, string>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: EssayAnswerPreviewDialogData,
    private ref: MatDialogRef<EssayAnswerPreviewDialogComponent>,
    private qs: QuestionService,
    private zone: NgZone
  ) {
    this.totalBlocks = data.preview.totalBlocks;
    this.blocks = (data.preview.blocks || []).map(b => ({
      ...b,
      include: b.include ?? true,
      editing: false
    }));
    this.loadQuestionCodes();
  }

  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  // ======= Summary =======
  get selectedCount(): number {
    return this.blocks.filter(b => b.include).length;
  }

  get validSelectedCount(): number {
    return this.blocks.filter(b => b.include && b.valid).length;
  }

  get invalidSelectedCount(): number {
    return this.blocks.filter(b => b.include && !b.valid).length;
  }

  // ======= Helpers cho template =======

  /** Cho *ngFor trackBy */
  trackByIndex = (_: number, b: BlockVM) => b.index;

  blockHeader(b: BlockVM): string {
    if (b.baseCode && b.baseCode.trim().length) return b.baseCode;
    if (b.typeCode && b.typeCode.trim().length) return b.typeCode;
    return `#${b.index}`;
  }

  blockTypeLabel(b: BlockVM): string {
    return b.questionType === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : 'Tự luận';
  }

  /** Tone màu border trái giống dialog import */
  blockToneClass(b: BlockVM): string {
    if (!b.valid) return 'block-invalid import-card';
    const mappedCount = this.mappedCount(b);
    if (mappedCount === 0) return 'block-not-mapped import-card';
    if (mappedCount === 1) return 'block-one-mapped import-card';
    return 'block-multi-mapped import-card';
  }

  private mappedCount(b: BlockVM): number {
    if (!b.targetQuestionIds) return 0;
    return Object.values(b.targetQuestionIds).filter(v => v != null).length;
  }

  /** Lấy danh sách key (sub) cần hiển thị cho ESSAY/MCQ */
  subKeysOf(b: BlockVM): string[] {
    const keys = new Set<string>();

    if (b.questionType === 'ESSAY') {
      // ưu tiên essayAnswers
      Object.keys(b.essayAnswers || {}).forEach(k => keys.add(k));
      // bổ sung key nếu chỉ có current/new answers
      Object.keys(b.currentAnswers || {}).forEach(k => keys.add(k));
      Object.keys(b.newAnswers || {}).forEach(k => keys.add(k));
      if (keys.size === 0) keys.add(''); // essay 1 ý
    } else {
      // MCQ: 1 dòng duy nhất
      keys.add('');
    }
    return Array.from(keys);
  }

  currentAns(b: BlockVM, key: string): string {
    return b.currentAnswers?.[key] ?? '';
  }

  newAns(b: BlockVM, key: string): string {
    if (b.questionType === 'MULTIPLE_CHOICE') {
      // Ưu tiên map newAnswers, fallback sang mcAnswer
      return b.newAnswers?.[key] ?? b.mcAnswer ?? '';
    }
    return b.newAnswers?.[key] ?? '';
  }

  /** Setter cho đáp án mới để dùng với (ngModelChange) */
  setNewAns(b: BlockVM, key: string, value: string) {
    if (!b.newAnswers) b.newAnswers = {};
    b.newAnswers[key] = value ?? '';

    if (b.questionType === 'MULTIPLE_CHOICE') {
      b.mcAnswer = value ?? '';
    }
  }

  private loadQuestionCodes() {
    const ids = new Set<number>();

    for (const b of this.blocks) {
      console.log("block: " + b.warnings);
      Object.values(b.targetQuestionIds || {}).forEach(v => {
        if (typeof v === 'number') {
          ids.add(v);
        }
      });
    }

    if (!ids.size) return;

    this.qs.lookupQuestions(this.data.subjectId, Array.from(ids))
      .subscribe({
        next: (questions) => {
          for (const q of questions || []) {
            const id = (q as any).id as number;
            const code = (q as any).questionCode as string | undefined;
            if (typeof id === 'number') {
              this.questionCodeMap.set(id, code && code.trim().length ? code : `#${id}`);
            }
          }
        },
        error: () => {
          // nếu lỗi thì thôi, UI sẽ fallback hiển thị #id
        }
      });
  }

  /** Lấy questionCode theo sub-key; fallback #id nếu không có code */
  targetCode(b: BlockVM, key: string): string | null {
    const id = this.targetId(b, key);
    if (!id) return null;
    return this.questionCodeMap.get(id) ?? `#${id}`;
  }

  targetId(b: BlockVM, key: string): number | null {
    if (!b.targetQuestionIds) return null;
    const id = (b.targetQuestionIds as any)[key];
    return typeof id === 'number' ? id : null;
  }

  isMapped(b: BlockVM, key: string): boolean {
    return this.targetId(b, key) != null;
  }

  hasWarnings(b: BlockVM): boolean {
    return !!b.warnings && b.warnings.length > 0;
  }

  // ======= Tool Math & focus =======

  answerElementId(blockIndex: number, key: string): string {
    return `ans-${blockIndex}-${key || 'root'}`;
  }

  private getAnswerElement(blockIndex: number, key: string): HTMLTextAreaElement | HTMLInputElement | null {
    const id = this.answerElementId(blockIndex, key);
    return document.getElementById(id) as HTMLTextAreaElement | HTMLInputElement | null;
  }

  setFocus(blockIndex: number, key: string) {
    this.focused = { blockIndex, key };
  }

  private insertTpl(block: BlockVM, key: string, rawTpl: string, inline = true) {
    const el = this.getAnswerElement(block.index, key);
    const cur = this.newAns(block, key) || '';

    let selStart = cur.length;
    let selEnd = cur.length;

    if (el) {
      // @ts-ignore
      selStart = el.selectionStart ?? cur.length;
      // @ts-ignore
      selEnd = el.selectionEnd ?? cur.length;
    }

    const selected = cur.slice(selStart, selEnd);
    let tpl = rawTpl.replaceAll('${sel}', selected || '');

    if (inline && !(tpl.startsWith('\\(') && tpl.endsWith('\\)'))) {
      tpl = `\\(${tpl}\\)`;
    }

    let caretOffset = tpl.indexOf('${cursor}');
    if (caretOffset >= 0) {
      tpl = tpl.replace('${cursor}', '');
    } else {
      caretOffset = tpl.length;
    }

    const next = cur.slice(0, selStart) + tpl + cur.slice(selEnd);
    this.setNewAns(block, key, next);

    const pos = selStart + caretOffset;
    setTimeout(() => {
      if (!el) return;
      el.focus();
      // @ts-ignore
      el.setSelectionRange(pos, pos);
    });
  }

  /** Hàm được gọi từ ToolMathComponent */
  insertToFocused(rawTpl: string, inline = true) {
    if (!this.focused) return;
    const { blockIndex, key } = this.focused;
    const block = this.blocks.find(b => b.index === blockIndex);
    if (!block) return;
    this.insertTpl(block, key, rawTpl, inline);
  }

  // ======= UI actions =======

  onCardClick(ev: MouseEvent, b: BlockVM) {
    const target = ev.target as HTMLElement;
    // bỏ qua khi click vào input/textarea/button
    if (target.closest('button, .btn, input, textarea, select, mat-select, .mat-mdc-select, .mat-mdc-form-field')) {
      return;
    }
    if (this.isSaving || !b.valid) return;
    b.include = !b.include;
  }

  toggleEdit(b: BlockVM, ev: MouseEvent) {
    ev.stopPropagation();
    b.editing = !b.editing;
    if (!b.editing) {
      this.focused = null;
    }
  }

  /** Chọn tất cả / chỉ valid / chỉ invalid */
  selectAll(scope: 'ALL' | 'NONE' | 'VALID' | 'INVALID') {
    if (scope === 'ALL') {
      this.blocks.forEach(b => (b.include = true));
    } else if (scope === 'NONE') {
      this.blocks.forEach(b => (b.include = false));
    } else if (scope === 'VALID') {
      this.blocks.forEach(b => (b.include = !!b.valid));
    } else {
      this.blocks.forEach(b => (b.include = !b.valid));
    }
  }

  // ======= Progress ramp giống import câu hỏi =======
  private startRamp(durationMs = 2500) {
    this.stopRamp();
    this.rampDuration = durationMs;
    this.rampStart = 0;
    this.commitProgress = 0;

    const tick = (t: number) => {
      if (!this.rampStart) this.rampStart = t;
      const elapsed = t - this.rampStart;
      const p = Math.min(
        this.rampTarget,
        Math.round((elapsed / this.rampDuration) * this.rampTarget)
      );
      this.zone.run(() => {
        if (typeof this.commitProgress === 'number' && p > (this.commitProgress ?? 0)) {
          this.commitProgress = p;
        }
      });
      if (p < this.rampTarget) this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  private stopRamp() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.rampStart = 0;
  }

  // ======= Commit =======
  async onCommit() {
    const selected = this.blocks.filter(b => b.include);
    if (selected.length === 0) {
      await Swal.fire({
        icon: 'info',
        title: 'Chưa chọn block nào',
        text: 'Hãy tick những block bạn muốn áp dụng đáp án mới.',
        confirmButtonText: 'Đã hiểu'
      });
      return;
    }

    const validSelected = this.validSelectedCount;
    const invalidSelected = this.invalidSelectedCount;

    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: 'Xác nhận cập nhật đáp án?',
      html: `
        <div style="text-align:left">
          • Tổng block trong file: <b>${this.totalBlocks}</b><br/>
          • Block được chọn: <b>${selected.length}</b><br/>
          • Block hợp lệ (có map): <b>${validSelected}</b><br/>
          ${invalidSelected > 0 ? `• Block được chọn nhưng không map được: <b>${invalidSelected}</b><br/>` : ''}
          • Hệ thống sẽ cập nhật đáp án cho các câu hỏi tương ứng.
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Xác nhận',
      cancelButtonText: 'Kiểm tra lại'
    });

    if (!isConfirmed) return;

    this.isSaving = true;
    this.ref.disableClose = true;
    this.startRamp(2500);

    const payload = {
      sessionId: this.data.preview.sessionId,
      blocks: this.blocks.map(b => ({
        index: b.index,
        include: !!b.include
        // NOTE: hiện tại BE chỉ nhận index + include.
        // Nếu sau này cần gửi đáp án đã chỉnh sửa, payload sẽ phải mở rộng ở đây.
      }))
    };

    this.qs
      .importAnswersCommitProgress(this.data.subjectId, payload)
      .subscribe({
        next: (ev) => {
          if (ev.type === HttpEventType.UploadProgress) {
            const total = (ev as any).total;
            if (total) {
              const p = Math.round(((ev as any).loaded / total) * 30);
              this.commitProgress = Math.max(this.commitProgress ?? 0, p);
            }
          } else if (ev.type === HttpEventType.Response) {
            this.stopRamp();
            this.commitProgress = 100;
            const body = (ev as any).body as AnswerImportResult;
            requestAnimationFrame(() =>
              this.ref.close({ committed: true, result: body })
            );
          }
        },
        error: async (err) => {
          this.stopRamp();
          this.isSaving = false;
          this.commitProgress = null;
          this.ref.disableClose = false;
          await Swal.fire({
            icon: 'error',
            title: 'Lỗi khi cập nhật đáp án',
            text: err?.error?.message || 'Có lỗi xảy ra trong quá trình commit. Hãy thử lại.'
          });
          this.ref.close({ committed: false });
        }
      });
  }

  onCancel() {
    if (this.isSaving) return;
    this.ref.close({ committed: false });
  }

  /** Cho nút "Đóng và thử lại" trong loading overlay */
  onAbortCommit() {
    this.stopRamp();
    this.isSaving = false;
    this.commitProgress = null;
    this.ref.disableClose = false;
    this.ref.close({ committed: false });
  }
}
