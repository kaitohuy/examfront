import { Component, Inject, ElementRef, ViewChildren, QueryList, AfterViewInit, OnDestroy } from '@angular/core';
import baseUrl from '../../../services/helper';
import { QuestionService } from '../../../services/question.service';
import { PreviewBlock } from '../../../models/previewBlock';
import { DialogData } from '../../../models/dialogData';
import { sharedImports } from '../../../shared/shared-imports';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';

declare const RichTextEditor: any; // 👈 global từ script đã add

type QuestionLabel = 'PRACTICE' | 'EXAM';

@Component({
  selector: 'app-import-preview-dialog',
  standalone: true,
  imports: [
    ...sharedImports,
    MatDialogModule,
    MatCheckboxModule
  ],
  templateUrl: './import-preview-dialog.component.html',
  styles: [`
    .img-check {
      display: inline-flex; align-items: center; gap: 6px;
      border: 1px solid rgba(0,0,0,.12); border-radius: 6px; padding: 6px;
    }
    .img-check img { height: 56px; width: auto; object-fit: contain; border-radius: 4px; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
  `]
})
export class ImportPreviewDialogComponent implements AfterViewInit, OnDestroy {
  diffs: Array<'A' | 'B' | 'C' | 'D' | 'E'> = ['A', 'B', 'C', 'D', 'E'];
  chapters: Array<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7> = [0, 1, 2, 3, 4, 5, 6, 7];

  /** Options cho mat-select labels (per-block) */
  readonly labelOptions: QuestionLabel[] = ['PRACTICE', 'EXAM'];

  selectAll = true;
  loading = false;

  state: Array<PreviewBlock & { include: boolean; labels?: QuestionLabel[] }> = [];

  // Tất cả textarea dùng cho RTE
  @ViewChildren('rteArea') rteAreas!: QueryList<ElementRef<HTMLTextAreaElement>>;

  // Lưu instance editor theo block.index
  private editors = new Map<number, any>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private ref: MatDialogRef<ImportPreviewDialogComponent>,
    private qs: QuestionService
  ) {
    this.state = (data.preview.blocks || []).map(b => ({
      ...b,
      include: true,
      content: b.content || '',
      optionA: b.optionA || '',
      optionB: b.optionB || '',
      optionC: b.optionC || '',
      optionD: b.optionD || '',
      answer: b.answer || '',
      answerText: b.answerText || '',
      imageIndexes: Array.isArray(b.imageIndexes) ? [...b.imageIndexes] : [],
      warnings: b.warnings || [],
      // đảm bảo có mảng labels
      labels: Array.isArray((b as any).labels) ? ([...(b as any).labels] as QuestionLabel[]) : []
    }));
  }

  ngAfterViewInit(): void {
    this.initEditors();
    // Khi danh sách thay đổi (do *ngFor), build lại editor cho item mới
    this.rteAreas.changes.subscribe(() => this.initEditors());
  }

  ngOnDestroy(): void {
    this.editors.forEach(e => { try { e.destroy?.(); } catch { } });
    this.editors.clear();
  }

  private initEditors(): void {
    // Đợi DOM ổn định
    setTimeout(() => {
      this.rteAreas.forEach((el, i) => {
        const s = this.state[i];
        if (!s) return;
        const key = s.index;

        if (this.editors.has(key)) return; // đã khởi tạo
        if (typeof RichTextEditor === 'undefined') return; // script chưa load

        const inst = new RichTextEditor(el.nativeElement); // tạo editor

        // set nội dung ban đầu
        try { inst.setHTMLCode?.(s.content || ''); } catch {}

        // lắng nghe thay đổi để đồng bộ về state
        if (inst.attachEvent) {
          inst.attachEvent('change', () => {
            try { this.state[i].content = inst.getHTMLCode?.() ?? ''; } catch {}
          });
        } else {
          // fallback
          el.nativeElement.addEventListener('input', () => {
            try { this.state[i].content = inst.getHTMLCode?.() ?? el.nativeElement.value ?? ''; } catch {}
          });
        }

        this.editors.set(key, inst);
      });
    });
  }

  trackByIndex = (_: number, s: any) => s.index;

  imageUrl(idx: number) {
    return `${baseUrl}/subject/${this.data.subjectId}/questions/image/${this.data.preview.sessionId}/${idx}`;
  }

  toggleSelectAll() {
    this.state.forEach(s => s.include = this.selectAll);
  }

  // nhận Event từ template và tự cast trong TS
  onImgToggle(s: any, imgIdx: number, ev: Event) {
    const input = ev.target as HTMLInputElement;
    const existed = s.imageIndexes.includes(imgIdx);
    if (input.checked && !existed) s.imageIndexes.push(imgIdx);
    if (!input.checked && existed) s.imageIndexes = s.imageIndexes.filter((x: number) => x !== imgIdx);
  }

  commit() {
    // đảm bảo lấy nội dung mới nhất từ editor
    this.editors.forEach((ed, key) => {
      const idx = this.state.findIndex(x => x.index === key);
      if (idx > -1) {
        try { this.state[idx].content = ed.getHTMLCode?.() ?? this.state[idx].content; } catch {}
      }
    });

    const included = this.state.filter(s => s.include).length;
    if (included === 0) return;

    this.loading = true;

    const blocks = this.state.map(s => {
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
        base.optionA = s.optionA; base.optionB = s.optionB;
        base.optionC = s.optionC; base.optionD = s.optionD;
        base.answer = s.answer;
      } else {
        base.answerText = s.answerText || '';
      }

      // luôn gửi labels (BE sẽ fallback nếu rỗng)
      base.labels = Array.isArray(s.labels) ? s.labels : [];

      return base;
    });

    const payload = { sessionId: this.data.preview.sessionId, blocks };

    this.qs.importCommit(this.data.subjectId, payload, !!this.data.saveCopy).subscribe({
      next: (r) => { this.loading = false; this.ref.close({ committed: true, result: r }); },
      error: () => { this.loading = false; this.ref.close({ committed: false }); }
    });
  }
}
