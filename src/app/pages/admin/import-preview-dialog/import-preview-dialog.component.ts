import { Component, Inject, NgZone, OnDestroy } from '@angular/core';
import baseUrl from '../../../services/helper';
import { QuestionService } from '../../../services/question.service';
import { PreviewBlock } from '../../../models/previewBlock';
import { DialogData } from '../../../models/dialogData';
import { sharedImports } from '../../../shared/shared-imports';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { LoadingScreenComponent } from '../../loading-screen/loading-screen.component';
import { HttpEventType } from '@angular/common/http';
import { ToolMathComponent } from '../../../shared/tool-math/tool-math.component';
import Swal from 'sweetalert2';

type QuestionLabel = 'PRACTICE' | 'EXAM';
type TexField = 'content' | 'answerText' | 'optionA' | 'optionB' | 'optionC' | 'optionD';

@Component({
  selector: 'app-import-preview-dialog',
  standalone: true,
  imports: [
    ...sharedImports,
    MatDialogModule,
    MatCheckboxModule,
    LoadingScreenComponent,
    ToolMathComponent
  ],
  templateUrl: './import-preview-dialog.component.html',
  styleUrls: ['./import-preview-dialog.component.css']
})
export class ImportPreviewDialogComponent implements OnDestroy {
  diffs: Array<'A' | 'B' | 'C' | 'D' | 'E'> = ['A', 'B', 'C', 'D', 'E'];
  chapters: Array<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7> = [0, 1, 2, 3, 4, 5, 6, 7];
  readonly labelOptions: QuestionLabel[] = ['PRACTICE', 'EXAM'];

  selectAll = true;
  loading = false;
  saveCopy = !!this.data.saveCopy;
  commitProgress: number | null = null;

  private rafId = 0;
  private rampStart = 0;
  private rampDuration = 3500;
  private rampTarget = 95;

  // ô đang focus
  focused: { index: number; field: TexField } | null = null;

  state: Array<
    PreviewBlock & {
      include: boolean;
      labels?: QuestionLabel[];
      allImageIndexes?: number[]; // giữ toàn bộ idx ảnh ban đầu để tick lại
    }
  > = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public ref: MatDialogRef<ImportPreviewDialogComponent>,
    private qs: QuestionService,
    private zone: NgZone
  ) {
    this.state = (data.preview.blocks || []).map((b) => {
      const imageIndexes = Array.isArray(b.imageIndexes) ? [...b.imageIndexes] : [];
      return {
        ...b,
        include: true,
        content: b.content || '',
        optionA: b.optionA || '',
        optionB: b.optionB || '',
        optionC: b.optionC || '',
        optionD: b.optionD || '',
        answer: b.answer || '',
        answerText: b.answerText || '',
        imageIndexes,                   // ảnh đang chọn
        allImageIndexes: [...imageIndexes], // toàn bộ ảnh ban đầu
        warnings: b.warnings || [],
        labels: Array.isArray((b as any).labels) ? ([...(b as any).labels] as QuestionLabel[]) : []
      } as any;
    });
  }

  ngOnDestroy(): void {
    // không có objectURL cần thu hồi nữa
  }

  // ---------- Focus helpers ----------
  setFocus(index: number, field: TexField) {
    this.focused = { index, field };
  }

  private elBy(index: number, field: TexField): HTMLTextAreaElement | HTMLInputElement | null {
    return document.getElementById(`tex-${field}-${index}`) as any;
  }

  insertTpl(s: any, field: TexField, rawTpl: string, inline = true) {
    const idx = this.state.findIndex((x) => x.index === s.index);
    if (idx < 0) return;

    const el = this.elBy(idx, field);
    const cur = (s[field] ?? '') as string;

    let selStart = cur.length, selEnd = cur.length;
    if (el) {
      selStart = (el as any).selectionStart ?? cur.length;
      selEnd = (el as any).selectionEnd ?? cur.length;
    }
    const selected = cur.slice(selStart, selEnd);

    let tpl = rawTpl.replaceAll('${sel}', selected || '');
    if (inline) {
      if (!(tpl.startsWith('\\(') && tpl.endsWith('\\)'))) {
        tpl = `\\(${tpl}\\)`;
      }
    }

    let caretOffset = tpl.indexOf('${cursor}');
    if (caretOffset >= 0) tpl = tpl.replace('${cursor}', '');
    else caretOffset = tpl.length;

    const next = cur.slice(0, selStart) + tpl + cur.slice(selEnd);
    s[field] = next;

    const pos = selStart + caretOffset;
    setTimeout(() => {
      if (!el) return;
      el.focus();
      (el as any).setSelectionRange(pos, pos);
    });
  }

  insertToFocused(rawTpl: string, inline = true) {
    if (!this.focused) return;
    const s = this.state[this.focused.index];
    if (!s) return;
    this.insertTpl(s, this.focused.field, rawTpl, inline);
  }

  // ---------- UI helpers ----------
  trackByIndex = (_: number, s: any) => s.index;
  trackByImgIdx = (_: number, idx: number) => idx;

  // URL ảnh trực tiếp (BE public, không cần auth)
  imageUrl(idx: number) {
    // thêm query để tránh cache nhầm theo session
    return `${baseUrl}/subject/${this.data.subjectId}/questions/image/${this.data.preview.sessionId}/${idx}?_=${this.data.preview.sessionId}`;
  }

  onImageError(ev: Event) {
    const el = ev.target as HTMLImageElement;
    // fallback hiển thị khung rỗng thay vì icon gãy
    el.style.opacity = '0.5';
    el.alt = 'Không tải được ảnh';
  }

  toggleSelectAll() {
    this.state.forEach((s) => (s.include = this.selectAll));
  }

  // ẢNH: chọn/bỏ theo idx, và chọn tất/bỏ tất
  isImgIncluded(s: any, idx: number): boolean {
    return Array.isArray(s.imageIndexes) && s.imageIndexes.includes(idx);
  }
  onImgToggleIndex(s: any, idx: number, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    if (checked) {
      if (!s.imageIndexes.includes(idx)) s.imageIndexes.push(idx);
    } else {
      s.imageIndexes = s.imageIndexes.filter((x: number) => x !== idx);
    }
  }

  // ---------- Ramp ----------
  private startRamp(durationMs = 3500) {
    this.stopRamp();
    this.rampDuration = durationMs;
    this.rampStart = 0;
    this.commitProgress = 0;

    const tick = (t: number) => {
      if (!this.rampStart) this.rampStart = t;
      const elapsed = t - this.rampStart;
      const p = Math.min(this.rampTarget, Math.round((elapsed / this.rampDuration) * this.rampTarget));
      if (typeof this.commitProgress === 'number' && p > this.commitProgress) {
        this.zone.run(() => (this.commitProgress = p));
      }
      if (p < this.rampTarget) this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }
  private stopRamp() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.rampStart = 0;
  }

  // ---------- Commit ----------
  async commit() {
    const selected = this.state.filter((s) => s.include);
    if (selected.length === 0) {
      await Swal.fire({
        icon: 'info',
        title: 'Chưa chọn câu nào',
        text: 'Hãy tick những card bạn muốn tải lên hệ thống.',
        confirmButtonText: 'Đã hiểu'
      });
      return;
    }

    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: 'Xác nhận tải các mục đã chọn?',
      html: `
        <div style="text-align:left">
          • Số câu sẽ commit: <b>${selected.length}</b><br/>
          • Hãy đảm bảo nội dung đã được soát, LaTeX hiển thị đúng ở ô Preview.<br/>
          • Hành động này sẽ lưu các câu hỏi vào ngân hàng dữ liệu${this.saveCopy ? ' và <b>kho chung</b>' : ''}.
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Xác nhận',
      cancelButtonText: 'Kiểm tra lại'
    });
    if (!isConfirmed) return;

    this.ref.disableClose = true;
    this.loading = true;
    this.startRamp(3500);

    const blocks = this.state.map((s) => {
      const base: any = {
        index: s.index,
        include: !!s.include,
        questionType: s.questionType,
        difficulty: s.difficulty,
        chapter: s.chapter,
        content: s.content,
        imageIndexes: s.imageIndexes
      };
      if (s.questionType === 'MULTIPLE_CHOICE') {
        base.optionA = s.optionA;
        base.optionB = s.optionB;
        base.optionC = s.optionC;
        base.optionD = s.optionD;
        base.answer = s.answer;
      } else {
        base.answerText = s.answerText || '';
      }
      base.labels = Array.isArray(s.labels) ? s.labels : [];
      return base;
    });

    const payload = { sessionId: this.data.preview.sessionId, blocks };

    this.qs.importCommitProgress(this.data.subjectId, payload, this.saveCopy)
      .subscribe({
        next: (ev) => {
          switch (ev.type) {
            case HttpEventType.UploadProgress: {
              const total = (ev as any).total;
              if (total) {
                const up = Math.round(((ev as any).loaded / total) * 30);
                this.commitProgress = Math.max(up, this.commitProgress ?? 0);
              }
              break;
            }
            case HttpEventType.Response: {
              this.stopRamp();
              this.commitProgress = 100;
              requestAnimationFrame(() =>
                this.ref.close({ committed: true, result: (ev as any).body })
              );
              break;
            }
          }
        },
        error: async () => {
          this.stopRamp();
          this.loading = false;
          this.commitProgress = null;
          this.ref.disableClose = false;
          await Swal.fire({
            icon: 'error',
            title: 'Lỗi khi lưu',
            text: 'Có lỗi xảy ra trong quá trình commit. Hãy thử lại.'
          });
          this.ref.close({ committed: false });
        }
      });
  }

  onCardClick(ev: MouseEvent, s: any) {
    const target = ev.target as HTMLElement;
    if (
      target.closest(
        'button, .btn, input, textarea, select, mat-select, .mat-mdc-select, .mat-mdc-form-field, .img-check'
      )
    ) {
      return;
    }
    s.include = !s.include;
    this.selectAll = this.state.every((x) => x.include);
  }
}
