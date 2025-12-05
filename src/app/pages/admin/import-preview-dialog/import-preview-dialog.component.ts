// ENHANCED VERSION: compact filters dropdown, select-all by duplicate, cleaned structure

import { Component, Inject, NgZone, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import baseUrl from '../../../services/helper';
import { QuestionService } from '../../../services/question.service';
import { PreviewBlock } from '../../../models/previewBlock';
import { DialogData } from '../../../models/dialogData';
import { sharedImports } from '../../../shared/shared-imports';
import { LoadingScreenComponent } from '../../loading-screen/loading-screen.component';
import { ToolMathComponent } from '../../../shared/tool-math/tool-math.component';
import Swal from 'sweetalert2';
import { DuplicateListDialogComponent } from '../duplicate-list-dialog/duplicate-list-dialog.component';
import { debounceTime, distinctUntilChanged } from 'rxjs';

type QuestionLabel = 'PRACTICE' | 'EXAM';
type TexField = 'content' | 'answerText' | 'optionA' | 'optionB' | 'optionC' | 'optionD';
type DifficultyBE = 'A' | 'B' | 'C' | 'D' | 'E' | '';

interface PreviewState extends PreviewBlock {
  include: boolean;
  labels?: QuestionLabel[];
  allImageIndexes?: number[];
  editing: boolean;
}

@Component({
  selector: 'app-import-preview-dialog',
  standalone: true,
  imports: [
    ...sharedImports,
    MatDialogModule,
    MatCheckboxModule,
    MatMenuModule,
    LoadingScreenComponent,
    ToolMathComponent
  ],
  templateUrl: './import-preview-dialog.component.html',
  styleUrls: ['./import-preview-dialog.component.css']
})
export class ImportPreviewDialogComponent implements OnDestroy {
  readonly diffOptions: Array<{ value: 'A' | 'B' | 'C' | 'D' | 'E'; label: string }> = [
    { value: 'A', label: '5 điểm' },
    { value: 'B', label: '4 điểm' },
    { value: 'C', label: '3 điểm' },
    { value: 'D', label: '2 điểm' },
    { value: 'E', label: '1 điểm' }
  ];
  chapters: Array<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7> = [0, 1, 2, 3, 4, 5, 6, 7];
  readonly labelOptions: Array<{ value: QuestionLabel; label: string }> = [
    { value: 'PRACTICE', label: 'Ôn tập' },
    { value: 'EXAM', label: 'Thi cử' }
  ];

  weakThr = 0.60;
  strongThr = 0.70;

  loading = false;
  saveCopy = !!this.data.saveCopy;
  commitProgress: number | null = null;

  private rafId = 0;
  private rampStart = 0;
  private rampDuration = 3500;
  private rampTarget = 95;

  focused: { index: number; field: TexField } | null = null;

  // NEW: subtitle hint khi chọn "câu nghi trùng"
  selectHint: string | null = null;
  private hintTimer: any;

  // filters (search realtime; 3 dropdown filters; duplicate)
  searchCtrl = new FormControl<string>('', { nonNullable: true });
  filterDifficulty = new FormControl<DifficultyBE>('', { nonNullable: true });
  filterChapter = new FormControl<number | null>(null);
  filterType = new FormControl<'' | 'MULTIPLE_CHOICE' | 'ESSAY'>('', { nonNullable: true });
  filterDuplicate = new FormControl<'ALL' | 'WEAK' | 'STRONG'>('ALL', { nonNullable: true });

  pending = {
    difficulty: '' as DifficultyBE,
    chapter: null as number | null,
    type: '' as '' | 'MULTIPLE_CHOICE' | 'ESSAY'
  };

  private allState: PreviewState[] = [];
  state: PreviewState[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public ref: MatDialogRef<ImportPreviewDialogComponent>,
    private qs: QuestionService,
    private zone: NgZone,
    public dialog: MatDialog
  ) {
    this.allState = (data.preview.blocks || []).map((b) => {
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
        imageIndexes,
        allImageIndexes: [...imageIndexes],
        warnings: b.warnings || [],
        labels: Array.isArray((b as any).labels) ? ([...(b as any).labels] as QuestionLabel[]) : [],
        editing: false
      } as PreviewState;
    });
    this.state = [...this.allState];
    this.searchCtrl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => this.applyFilters());
    this.filterDifficulty.valueChanges.subscribe(() => this.applyFilters());
    this.filterChapter.valueChanges.subscribe(() => this.applyFilters());
    this.filterType.valueChanges.subscribe(() => this.applyFilters());
    this.filterDuplicate.valueChanges.subscribe(() => this.applyFilters());
  }

  ngOnDestroy(): void {
    if (this.hintTimer) clearTimeout(this.hintTimer);
  }

  private applyFilters() {
    const search = this.searchCtrl.value.toLowerCase().trim();
    const diff = this.filterDifficulty.value;
    const chap = this.filterChapter.value;
    const type = this.filterType.value;
    const dup = this.filterDuplicate.value;

    this.state = this.allState.filter((s) => {
      if (search && !(s.content || '').toLowerCase().includes(search)) return false;
      if (diff && s.difficulty !== diff) return false;
      if (chap !== null && s.chapter !== chap) return false;
      if (type && s.questionType !== type) return false;
      if (dup !== 'ALL') {
        const maxScore = Math.max(s.duplicateScore ?? 0, (s as any).duplicateBundleScore ?? 0);
        if (dup === 'WEAK' && maxScore < this.weakThr) return false;
        if (dup === 'STRONG' && maxScore < this.strongThr) return false;
      }
      return true;
    });
  }

  clearFilters() {
    this.searchCtrl.setValue('');
    this.filterDifficulty.setValue('');
    this.filterChapter.setValue(null);
    this.filterType.setValue('');
    this.filterDuplicate.setValue('ALL');
  }

  get totalBlocks(): number {
    return this.allState.length;
  }
  get selectedCount(): number {
    return this.state.filter((s) => s.include).length;
  }

  get weakDupCount(): number {
    return this.allState.filter((s) => {
      const maxScore = Math.max(s.duplicateScore ?? 0, (s as any).duplicateBundleScore ?? 0);
      return maxScore >= this.weakThr && maxScore < this.strongThr;
    }).length;
  }
  get strongDupCount(): number {
    return this.allState.filter((s) => {
      const maxScore = Math.max(s.duplicateScore ?? 0, (s as any).duplicateBundleScore ?? 0);
      return maxScore >= this.strongThr;
    }).length;
  }

  dupPct(score?: number | null): string {
    if (score == null) return '';
    return `${Math.round(score * 100)}% trùng`;
  }
  dupTip(s: PreviewBlock): string {
    const ids = (s.duplicateOfIds && s.duplicateOfIds.length) ? `#${s.duplicateOfIds.join(', #')}` : '—';
    const pct = this.dupPct(s.duplicateScore);
    return `Nghi trùng: ${pct}\nCâu đã có: ${ids}`;
  }
  cardToneClass(s: PreviewBlock & { include: boolean }) {
    const sc = Math.max(s.duplicateScore ?? 0, (s as any).duplicateBundleScore ?? 0);
    if (sc >= this.strongThr) return 'dup-strong';
    if (sc >= this.weakThr) return 'dup-weak';
    return '';
  }

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
    if (el) { selStart = (el as any).selectionStart ?? cur.length; selEnd = (el as any).selectionEnd ?? cur.length; }
    const selected = cur.slice(selStart, selEnd);
    let tpl = rawTpl.replaceAll('${sel}', selected || '');
    if (inline && !(tpl.startsWith('\\(') && tpl.endsWith('\\)'))) tpl = `\\(${tpl}\\)`;
    let caretOffset = tpl.indexOf('${cursor}');
    if (caretOffset >= 0) tpl = tpl.replace('${cursor}', ''); else caretOffset = tpl.length;
    const next = cur.slice(0, selStart) + tpl + cur.slice(selEnd);
    s[field] = next;
    const pos = selStart + caretOffset;
    setTimeout(() => { if (!el) return; el.focus(); (el as any).setSelectionRange(pos, pos); });
  }
  insertToFocused(rawTpl: string, inline = true) {
    if (!this.focused) return;
    const s = this.state[this.focused.index];
    if (!s) return;
    this.insertTpl(s, this.focused.field, rawTpl, inline);
  }

  trackByIndex = (_: number, s: any) => s.index;
  trackByImgIdx = (_: number, idx: number) => idx;

  imageUrl(idx: number) {
    return `${baseUrl}/subject/${this.data.subjectId}/questions/image/${this.data.preview.sessionId}/${idx}?_=${this.data.preview.sessionId}`;
  }
  onImageError(ev: Event) {
    const el = ev.target as HTMLImageElement;
    el.style.opacity = '0.5';
    el.alt = 'Không tải được ảnh';
  }

  onCardClick(ev: MouseEvent, s: any) {
    const target = ev.target as HTMLElement;
    if (target.closest('button, .btn, input, textarea, select, mat-select, .mat-mdc-select, .mat-mdc-form-field, .img-check')) return;
    s.include = !s.include;
  }

  openDuplicateList(s: PreviewBlock) {
    const ids = s.duplicateOfIds || [];
    this.dialog.open(DuplicateListDialogComponent, { width: '900px', data: { subjectId: this.data.subjectId, ids, score: s.duplicateScore } });
  }
  bundleTip(s: PreviewBlock): string {
    const ids = (s as any).duplicateBundleIds?.length ? `#${(s as any).duplicateBundleIds.join(', #')}` : '—';
    const score = (s as any).duplicateBundleScore;
    const pct = score != null ? `${Math.round(score * 100)}% trùng` : '—';
    return `Nghi trùng khối câu: ${pct}\nBundle đã có: ${ids}`;
  }
  bundlePct(score?: number | null): string {
    if (score == null) return '';
    return `${Math.round(score * 100)}% trùng`;
  }
  openBundleList(s: any) {
    const ids = s.duplicateBundleIds || [];
    this.dialog.open(DuplicateListDialogComponent, { width: '900px', data: { subjectId: this.data.subjectId, ids, score: s.duplicateBundleScore, mode: 'bundle' } });
  }

  private maxDupScoreOf(s: PreviewState): number {
    return Math.max(s.duplicateScore ?? 0, (s as any).duplicateBundleScore ?? 0);
  }
  private isAnyDup(s: PreviewState): boolean {
    return this.maxDupScoreOf(s) >= this.weakThr;
  }

  selectAllByDup(scope: 'ALL' | 'NONE' | 'NON_DUP' | 'DUP') {
    if (scope === 'ALL') {
      this.state.forEach((x) => (x.include = true));
      this.setHint('Đã chọn tất cả các mục đang hiển thị.');
    } else if (scope === 'NONE') {
      this.state.forEach((x) => (x.include = false));
      this.setHint('Đã bỏ chọn tất cả các mục đang hiển thị.');
    } else if (scope === 'NON_DUP') {
      this.state.forEach((x) => (x.include = !this.isAnyDup(x)));
      this.setHint('Đang chọn tất cả câu KHÔNG nghi trùng trong danh sách đang hiển thị.');
    } else {
      this.state.forEach((x) => (x.include = this.isAnyDup(x)));
      this.setHint('Đang chọn tất cả câu NGHI TRÙNG trong danh sách đang hiển thị.');
    }
  }

  private setHint(msg: string) {
    this.selectHint = msg;
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => (this.selectHint = null), 8000);
  }

  openFilterDropdown() {
    this.pending.difficulty = this.filterDifficulty.value ?? '';
    this.pending.chapter = this.filterChapter.value;
    this.pending.type = this.filterType.value ?? '';
  }
  applyPendingFilters() {
    this.filterDifficulty.setValue(this.pending.difficulty || '');
    this.filterChapter.setValue(this.pending.chapter);
    this.filterType.setValue(this.pending.type || '');
    this.applyFilters();
  }
  clearPendingFilters() {
    this.pending = { difficulty: '', chapter: null, type: '' };
  }

  toggleEdit(i: number, s: any, ev: MouseEvent) {
    ev.stopPropagation();
    s.editing = !s.editing;
    if (s.editing) {
      setTimeout(() => {
        const el = this.elBy(i, 'content');
        if (el) {
          el.focus();
          const pos = (el as any).value?.length ?? 0;
          (el as any).setSelectionRange(pos, pos);
        }
        this.setFocus(i, 'content');
      });
    } else {
      this.focused = null;
    }
  }

  isImgIncluded(s: any, idx: number): boolean {
    return Array.isArray(s.imageIndexes) && s.imageIndexes.includes(idx);
  }
  onImgToggleIndex(s: any, idx: number, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    const arr = Array.isArray(s.imageIndexes) ? s.imageIndexes : (s.imageIndexes = []);
    if (checked) { if (!arr.includes(idx)) arr.push(idx); }
    else { s.imageIndexes = arr.filter((x: number) => x !== idx); }
  }

  private startRamp(durationMs = 3500) {
    this.stopRamp();
    this.rampDuration = durationMs;
    this.rampStart = 0;
    this.commitProgress = 0;
    const tick = (t: number) => {
      if (!this.rampStart) this.rampStart = t;
      const elapsed = t - this.rampStart;
      const p = Math.min(this.rampTarget, Math.round((elapsed / this.rampDuration) * this.rampTarget));
      if (typeof this.commitProgress === 'number' && p > this.commitProgress) this.zone.run(() => (this.commitProgress = p));
      if (p < this.rampTarget) this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }
  private stopRamp() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.rampStart = 0;
  }

  async commit() {
    const selected = this.allState.filter((s) => s.include);
    if (selected.length === 0) {
      await Swal.fire({ icon: 'info', title: 'Chưa chọn câu nào', text: 'Hãy tick những card bạn muốn tải lên hệ thống.', confirmButtonText: 'Đã hiểu' });
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
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Xác nhận',
      cancelButtonText: 'Kiểm tra lại'
    });
    if (!isConfirmed) return;

    this.ref.disableClose = true;
    this.loading = true;
    this.startRamp(3500);

    const blocks = this.allState.map((s) => {
      const base: any = { index: s.index, include: !!s.include, questionType: s.questionType, difficulty: s.difficulty, chapter: s.chapter, content: s.content, imageIndexes: s.imageIndexes };
      if (s.questionType === 'MULTIPLE_CHOICE') { base.optionA = s.optionA; base.optionB = s.optionB; base.optionC = s.optionC; base.optionD = s.optionD; base.answer = s.answer; }
      else { base.answerText = s.answerText || ''; }
      base.labels = Array.isArray(s.labels) ? s.labels : [];
      return base;
    });

    const payload = { sessionId: this.data.preview.sessionId, blocks };

    this.qs.importCommitProgress(this.data.subjectId, payload, this.saveCopy).subscribe({
      next: (ev) => {
        if (ev.type === HttpEventType.UploadProgress) {
          const total = (ev as any).total;
          if (total) this.commitProgress = Math.max(Math.round(((ev as any).loaded / total) * 30), this.commitProgress ?? 0);
        } else if (ev.type === HttpEventType.Response) {
          this.stopRamp();
          this.commitProgress = 100;
          requestAnimationFrame(() => this.ref.close({ committed: true, result: (ev as any).body }));
        }
      },
      error: async () => {
        this.stopRamp();
        this.loading = false;
        this.commitProgress = null;
        this.ref.disableClose = false;
        await Swal.fire({ icon: 'error', title: 'Lỗi khi lưu', text: 'Có lỗi xảy ra trong quá trình commit. Hãy thử lại.' });
        this.ref.close({ committed: false });
      }
    });
  }
}
