// Component quản lý danh sách câu hỏi: lọc, phân trang, chọn, CRUD, clone, import/export.
import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { Subscription, from, of } from 'rxjs';
import { catchError, concatMap, toArray } from 'rxjs/operators';

import { sharedImports } from '../../../shared/shared-imports';
import { withLoading } from '../../../shared/with-loading';
import { QuestionService } from '../../../services/question.service';
import { LoginService } from '../../../services/login.service';
import { QuestionEvent, QuestionEventsService } from '../../../services/question-events.service';
import { ImportPreviewDialogComponent } from '../import-preview-dialog/import-preview-dialog.component';
import { ExportOptions } from '../../../models/exportOptions';
import { ExportQuestionsDialogComponent } from '../export-questions-dialog/export-questions-dialog.component';
import { QuestionEditDialogComponent } from '../question-edit-dialog/question-edit-dialog.component';
import { LoadingScreenComponent } from '../../loading-screen/loading-screen.component';
import { MathjaxDirective } from '../../../shared/mathjax.directive';

type CloneState = { items: any[]; open: boolean; loading: boolean };

@Component({
  selector: 'app-question',
  standalone: true,
  imports: [...sharedImports, MatPaginator, MatDialogModule, LoadingScreenComponent, MathjaxDirective],
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.css']
})
export class QuestionComponent implements OnInit, OnDestroy {

  // Inputs
  @Input() subjectId!: number;
  @Input() departmentId!: number;
  @Input() labelFilter: 'ALL' | 'PRACTICE' | 'EXAM' = 'ALL';
  @Input() requireHeadForAnswers = false;

  // Loading/overlay
  isLoading = false;
  loadingTitle = 'Vui lòng đợi trong giây lát';
  loadingSubtitle = 'Đang chuyển hướng tới trang đích...';
  showProgressBar = false;
  progress: number | null = null;

  // State
  questions: any[] = [];
  clonesState: Partial<Record<number, CloneState>> = {};
  isAdminOrHead = false;

  // Active filters
  searchText = '';
  filterDifficulty = '';
  filterChapter: number | null = null;
  filterQuestionType = '';
  filterCreatedBy = '';
  filterDateRange: { from: Date | null; to: Date | null } = { from: null, to: null };

  // Pending filters (dropdown)
  pendingFilters = { difficulty: '', chapter: null as number | null, type: '', createdBy: '', from: null as Date | null, to: null as Date | null };

  // Paging
  paginatedQuestions: any[] = [];
  pageSize = 5;
  pageSizeOptions = [5, 10, 15, 20];
  currentPage = 0;
  totalItems = 0;

  // Answers visibility
  showAnswers = false;

  // Selection
  selectedIds = new Set<number>();

  //ramp
  private rampId?: number;
  private rampStart = 0;
  private rampTarget = 95;     // dừng ở 95% rồi chờ Response => 100
  private rampDuration = 3000; // 3s (tùy chỉnh)

  private startRamp() {
    this.stopRamp();
    this.rampStart = 0;
    const tick = (t: number) => {
      if (!this.rampStart) this.rampStart = t;
      const elapsed = t - this.rampStart;
      const p = Math.min(this.rampTarget, Math.round((elapsed / this.rampDuration) * (this.rampTarget - 30)) + 30);
      if (typeof this.progress === 'number') this.progress = Math.max(this.progress, p);
      if (p < this.rampTarget) this.rampId = requestAnimationFrame(tick);
    };
    this.rampId = requestAnimationFrame(tick);
  }
  private stopRamp() {
    if (this.rampId) cancelAnimationFrame(this.rampId);
    this.rampId = undefined;
  }

  // Internals
  private eventsSub?: Subscription;
  private searchTimeoutId?: number;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private questionService: QuestionService,
    private loginService: LoginService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private qevents: QuestionEventsService,
    private el: ElementRef
  ) { }

  // Lifecycle
  ngOnInit(): void {
    this.checkUserRole();
    this.loadQuestions();
    this.eventsSub = this.qevents.changed$.subscribe(e => { if (e.subjectId === this.subjectId) this.applyEvent(e); });
  }

  ngOnDestroy(): void {
    this.eventsSub?.unsubscribe();
    if (this.searchTimeoutId) clearTimeout(this.searchTimeoutId);
  }

  // Loading helpers
  reloadPage() { window.location.reload(); } // Reload trang khi user bấm action trong overlay
  private setLoadingText(title?: string, subtitle?: string) { if (title !== undefined) this.loadingTitle = title; if (subtitle !== undefined) this.loadingSubtitle = subtitle; }
  private resetLoadingText() { this.loadingTitle = 'Vui lòng đợi trong giây lát'; this.loadingSubtitle = 'Đang chuyển hướng tới trang đích...'; }
  private startProgress(title: string, subtitle: string, indeterminate = false) { this.loadingTitle = title; this.loadingSubtitle = subtitle; this.isLoading = true; this.showProgressBar = true; this.progress = indeterminate ? null : 0; }
  private stopProgress(delayMs = 0) { const stop = () => { this.isLoading = false; this.showProgressBar = false; this.progress = null; this.resetLoadingText(); }; delayMs > 0 ? setTimeout(stop, delayMs) : stop(); }

  // Role
  private checkUserRole(): void { const role = this.loginService.getUserRole(); this.isAdminOrHead = role === 'ADMIN' || role === 'HEAD'; }

  // Data load & normalize
  loadQuestions(): void {
    const labels = this.labelFilter !== 'ALL' ? [this.labelFilter] as ('PRACTICE' | 'EXAM')[] : undefined;
    this.questionService.getQuestionsBySubject(this.subjectId, labels).pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: (data) => {
          this.questions = (data || []).map((q: any) => ({ ...q, chapter: q.chapter != null ? Number(q.chapter) : null, labels: Array.isArray(q.labels) ? q.labels : [] }));
          this.updateDataSource(false);
        },
        error: (err) => this.showError('Lỗi khi tải danh sách câu hỏi: ' + (err.error?.message || 'Không xác định'))
      });
  }
  private normalize(q: any) { return { ...q, chapter: q?.chapter != null ? Number(q.chapter) : null }; }

  // Event bus
  private matchesThisTab(q: any): boolean { return this.labelFilter === 'ALL' || (Array.isArray(q.labels) && q.labels.includes(this.labelFilter)); }
  private applyEvent(e: QuestionEvent) {
    switch (e.action) {
      case 'delete': {
        const idx = this.questions.findIndex(x => x.id === e.id);
        if (idx !== -1) { this.questions.splice(idx, 1); this.updateDataSource(true); }
        for (const k of Object.keys(this.clonesState)) {
          const st = this.clonesState[+k];
          if (!st) continue;
          const i = st.items.findIndex(x => x.id === e.id);
          if (i !== -1) st.items.splice(i, 1);
        }
        return;
      }
      case 'create':
      case 'update': {
        const q = e.question; const idx = this.questions.findIndex(x => x.id === q.id); const match = this.matchesThisTab(q);
        if (match) { if (idx !== -1) this.questions[idx] = this.normalize(q); else this.questions.push(this.normalize(q)); }
        else if (idx !== -1) this.questions.splice(idx, 1);
        const pid = q.parentId;
        if (pid && this.clonesState[pid]?.open) {
          const st = this.clonesState[pid]!;
          const j = st.items.findIndex(x => x.id === q.id);
          if (j !== -1) st.items[j] = this.normalize(q);
          else if (e.action === 'create') st.items.push(this.normalize(q));
        }
        this.updateDataSource(true);
        return;
      }
    }
  }

  // Filters summary (active)
  get activeFilterSummaryParts(): string[] {
    const parts: string[] = [];
    if (this.filterDifficulty) parts.push(`Độ khó: ${this.filterDifficulty}`);
    if (this.filterChapter !== null) parts.push(`Chương: ${this.filterChapter}`);
    if (this.filterQuestionType) parts.push(`Loại: ${this.filterQuestionType === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : 'Tự luận'}`);
    if (this.filterCreatedBy) parts.push(`Người tạo: ${this.filterCreatedBy}`);
    const from = this.filterDateRange.from, to = this.filterDateRange.to;
    if (from || to) { const fmt = (d: Date) => new Date(d).toLocaleDateString(); parts.push(`Thời gian: ${from ? fmt(from) : '…'} → ${to ? fmt(to) : '…'}`); }
    const q = (this.searchText || '').trim(); if (q) parts.push(`Tìm: "${q}"`);
    return parts;
  }

  // Filters: clear/apply/sync
  clearAllFilters(): void {
    this.searchText = ''; this.filterDifficulty = ''; this.filterChapter = null; this.filterQuestionType = ''; this.filterCreatedBy = ''; this.filterDateRange = { from: null, to: null };
    this.syncPendingFromActive(); this.updateDataSource(false);
  }
  syncPendingFromActive(): void {
    this.pendingFilters = { difficulty: this.filterDifficulty || '', chapter: this.filterChapter, type: this.filterQuestionType || '', createdBy: this.filterCreatedBy || '', from: this.filterDateRange.from, to: this.filterDateRange.to };
  }
  applyPendingFilters(): void {
    this.filterDifficulty = this.pendingFilters.difficulty || '';
    this.filterChapter = this.pendingFilters.chapter;
    this.filterQuestionType = this.pendingFilters.type || '';
    this.filterCreatedBy = this.pendingFilters.createdBy || '';
    this.filterDateRange = { from: this.pendingFilters.from, to: this.pendingFilters.to };
    this.applyFilters();
  }
  applyFilters(): void { this.updateDataSource(false); }
  resetPendingFilters(): void { this.pendingFilters = { difficulty: '', chapter: null, type: '', createdBy: '', from: null, to: null }; }
  cancelPendingChanges(): void { this.syncPendingFromActive(); }
  hasPendingChanges(): boolean {
    return (
      this.pendingFilters.difficulty !== (this.filterDifficulty || '') ||
      this.pendingFilters.chapter !== this.filterChapter ||
      this.pendingFilters.type !== (this.filterQuestionType || '') ||
      this.pendingFilters.createdBy !== (this.filterCreatedBy || '') ||
      this.pendingFilters.from?.getTime() !== this.filterDateRange.from?.getTime() ||
      this.pendingFilters.to?.getTime() !== this.filterDateRange.to?.getTime()
    );
  }
  getPendingChangesSummary(): string {
    const changes: string[] = [];
    if (this.pendingFilters.difficulty !== (this.filterDifficulty || '')) changes.push(`Độ khó: ${this.pendingFilters.difficulty || 'Tất cả'}`);
    if (this.pendingFilters.chapter !== this.filterChapter) changes.push(`Chương: ${this.pendingFilters.chapter === null ? 'Tất cả' : this.pendingFilters.chapter}`);
    if (this.pendingFilters.type !== (this.filterQuestionType || '')) changes.push(`Loại: ${this.pendingFilters.type === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : this.pendingFilters.type === 'ESSAY' ? 'Tự luận' : 'Tất cả'}`);
    if (this.pendingFilters.createdBy !== (this.filterCreatedBy || '')) changes.push(`Người tạo: ${this.pendingFilters.createdBy || '(trống)'}`);
    const fromChanged = this.pendingFilters.from?.getTime() !== this.filterDateRange.from?.getTime();
    const toChanged = this.pendingFilters.to?.getTime() !== this.filterDateRange.to?.getTime();
    if (fromChanged || toChanged) {
      const fromVal = this.pendingFilters.from ? this.pendingFilters.from.toLocaleDateString() : '…';
      const toVal = this.pendingFilters.to ? this.pendingFilters.to.toLocaleDateString() : '…';
      changes.push(`Thời gian: ${fromVal} → ${toVal}`);
    }
    return changes.join(', ');
  }

  // Dropdown helpers
  applyPendingFiltersAndClose(dropdownElement: HTMLElement): void { this.applyPendingFilters(); this.closeDropdown(dropdownElement); }
  closeDropdown(dropdownElement: HTMLElement): void {
    try {
      const Dropdown = (window as any).bootstrap?.Dropdown;
      if (Dropdown) {
        const inst = Dropdown.getOrCreateInstance(dropdownElement); // luôn tạo instance nếu chưa có
        inst.hide();                                               // chỉ hide, không toggle
        return;
      }
    } catch { }

    // Fallback thuần DOM (khi không có bootstrap global) – chỉ tháo trạng thái "mở" nếu đang mở
    const menu = dropdownElement.parentElement?.querySelector('.dropdown-menu') as HTMLElement | null;
    if (menu?.classList.contains('show')) {
      menu.classList.remove('show');
      dropdownElement.setAttribute('aria-expanded', 'false');
    }
  }
  onDatepickerClosed(event: any): void { event?.stopPropagation?.(); }
  @HostListener('document:click', ['$event'])
  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const target = ev.target as Element;
    const clickedInsideDropdown = !!target.closest('.dropdown-menu, .dropdown-toggle');
    const clickedOnMatOverlay = !!target.closest('.cdk-overlay-container');

    if (!clickedInsideDropdown && !clickedOnMatOverlay) {
      const toggler: HTMLElement | null = this.el.nativeElement.querySelector('.dropdown-toggle');
      // chỉ xử lý khi dropdown đang mở, tránh “đụng” lần đầu
      if (toggler && toggler.getAttribute('aria-expanded') === 'true') {
        this.closeDropdown(toggler);
      }
    }
  }
  // Search debounce
  onSearchInput(): void {
    if (this.searchTimeoutId) clearTimeout(this.searchTimeoutId);
    this.searchTimeoutId = window.setTimeout(() => this.updateDataSource(false), 300);
  }

  // Paging
  updateDataSource(preservePage: boolean): void {
    const total = this.filteredQuestions.length;
    this.totalItems = total;
    if (preservePage) {
      const maxPage = Math.max(0, Math.ceil(total / this.pageSize) - 1);
      this.currentPage = Math.min(this.currentPage, maxPage);
    } else {
      this.currentPage = 0;
    }
    this.updatePaginatedData();
    this.checkAuthorization();
  }
  updatePaginatedData(): void {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedQuestions = this.filteredQuestions.slice(startIndex, endIndex);
    if (this.paginatedQuestions.length === 0 && this.currentPage > 0) {
      this.currentPage--;
      const s = this.currentPage * this.pageSize;
      this.paginatedQuestions = this.filteredQuestions.slice(s, s + this.pageSize);
    }
  }
  onPageChange(event: PageEvent): void { this.currentPage = event.pageIndex; this.pageSize = event.pageSize; this.updatePaginatedData(); }

  // Filtered list
  get filteredQuestions(): any[] {
    let filtered = [...this.questions];
    if (this.labelFilter !== 'ALL') filtered = filtered.filter(q => (q.labels || []).includes(this.labelFilter));
    if (this.searchText) {
      const term = this.searchText.toLowerCase();
      filtered = filtered.filter(q => (q.content || '').toLowerCase().includes(term) || (q.questionType || '').toLowerCase().includes(term));
    }
    if (this.filterDifficulty) filtered = filtered.filter(q => q.difficulty === this.filterDifficulty);
    if (this.filterChapter !== null) { const target = Number(this.filterChapter); filtered = filtered.filter(q => Number(q.chapter) === target); }
    if (this.filterQuestionType) filtered = filtered.filter(q => q.questionType === this.filterQuestionType);
    if (this.filterCreatedBy) {
      const term = this.filterCreatedBy.toLowerCase();
      filtered = filtered.filter(q => (q.createdBy?.username || '').toLowerCase().includes(term) || (q.createdBy?.fullName || '').toLowerCase().includes(term));
    }
    const fromDate = this.normalizeFromDate(this.filterDateRange.from);
    const toDate = this.normalizeToDate(this.filterDateRange.to);
    if (fromDate || toDate) {
      filtered = filtered.filter(q => {
        const createdAt = new Date(q.createdAt);
        if (fromDate && createdAt < fromDate) return false;
        if (toDate && createdAt > toDate) return false;
        return true;
      });
    }
    filtered.sort((a, b) => (a?.id || 0) - (b?.id || 0));
    return filtered;
  }
  private normalizeFromDate(d?: Date | null): Date | null { if (!d) return null; const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  private normalizeToDate(d?: Date | null): Date | null { if (!d) return null; const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

  // Answers auth
  checkAuthorization(): void {
    if (!this.requireHeadForAnswers) return;
    if (!this.isAdminOrHead && this.showAnswers) {
      Swal.fire({ title: 'Yêu cầu cấp quyền', text: 'Bạn cần HEAD/ADMIN cấp quyền để hiển thị đáp án câu hỏi thi.', icon: 'warning', confirmButtonText: 'Đã hiểu' })
        .then(() => this.showAnswers = false);
    }
  }

  // CRUD dialogs
  openCreateQuestionDialog(): void {
    const ref = this.dialog.open(QuestionEditDialogComponent, { width: '720px', maxHeight: '90vh', data: { subjectId: this.subjectId, mode: 'create' }, autoFocus: false });
    ref.afterClosed().subscribe((q) => {
      if (!q) return;
      const stillMatch = this.labelFilter === 'ALL' || (Array.isArray(q.labels) && q.labels.includes(this.labelFilter));
      if (stillMatch) { this.questions.push(this.normalize(q)); this.updateDataSource(true); }
      else { this.updateDataSource(true); this.showSuccess('Đã tạo câu hỏi và chuyển sang tab khác theo nhãn.'); }
    });
  }
  openEditQuestionDialog(question: any): void {
    const ref = this.dialog.open(QuestionEditDialogComponent, { width: '720px', maxHeight: '90vh', data: { subjectId: this.subjectId, mode: 'edit', question }, autoFocus: false });
    ref.afterClosed().subscribe((q) => {
      if (!q) return;
      const stillMatch = this.labelFilter === 'ALL' || (Array.isArray(q.labels) && q.labels.includes(this.labelFilter));
      const idx = this.questions.findIndex(x => x.id === q.id);
      if (!stillMatch) { if (idx !== -1) this.questions.splice(idx, 1); this.updateDataSource(true); this.showSuccess('Câu hỏi đã được cập nhật và chuyển sang tab khác theo nhãn.'); return; }
      if (idx !== -1) this.questions[idx] = this.normalize(q);
      this.updateDataSource(true);
      this.showSuccess('Cập nhật câu hỏi thành công');
    });
  }
  deleteQuestion(questionId: number): void {
    Swal.fire({ title: 'Xác nhận xóa', text: 'Bạn có chắc chắn muốn xóa câu hỏi này?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Xóa', cancelButtonText: 'Hủy' })
      .then((result) => {
        if (!result.isConfirmed) return;
        this.setLoadingText('Đang xóa câu hỏi…', 'Vui lòng đợi trong giây lát'); this.isLoading = true;
        this.questionService.deleteQuestion(this.subjectId, questionId).pipe(withLoading(v => this.isLoading = v))
          .subscribe({
            next: () => { this.questions = this.questions.filter(q => q.id !== questionId); this.updateDataSource(true); this.qevents.emit({ subjectId: this.subjectId, action: 'delete', id: questionId }); this.showSuccess('Xóa câu hỏi thành công'); },
            error: (err) => this.showError('Lỗi khi xóa câu hỏi: ' + (err.error?.message || 'Không xác định'))
          });
      });
  }

  // Selection
  get selectedCount(): number { return this.selectedIds.size; }
  isSelected(id: number): boolean { return this.selectedIds.has(id); }
  toggleSelection(id: number, checked: boolean) { if (checked) this.selectedIds.add(id); else this.selectedIds.delete(id); }
  toggleSelectAllOnPage(checked: boolean) { for (const q of this.paginatedQuestions) checked ? this.selectedIds.add(q.id) : this.selectedIds.delete(q.id); }
  selectAllList(): void { this.selectedIds.clear(); for (const q of this.filteredQuestions) this.selectedIds.add(q.id); }
  clearSelection() { this.selectedIds.clear(); }
  trackById(index: number, q: any) { return q?.id; }
  areAllOnPageSelected(): boolean { const page = this.paginatedQuestions || []; return page.length > 0 && page.every(q => this.selectedIds.has(q.id)); }
  onSelectAllChange(evt: Event): void { const checked = (evt.target as HTMLInputElement).checked; this.toggleSelectAllOnPage(checked); }
  onItemSelectChange(evt: Event, id: number): void { const checked = (evt.target as HTMLInputElement).checked; this.toggleSelection(id, checked); }
  isCloneSelected(id: number): boolean {
    return this.selectedIds.has(id);
  }

  onCloneSelectChange(evt: Event, clone: any): void {
    const checked = (evt.target as HTMLInputElement).checked;
    if (checked) this.selectedIds.add(clone.id);
    else this.selectedIds.delete(clone.id);
  }

  onCardClick(ev: MouseEvent, id: number): void {
    const target = ev.target as HTMLElement;
    if (
      target.closest('.clone-card') ||
      target.closest('button, .btn, a, .form-check-input, .item-checkbox, .mat-mdc-slide-toggle')
    ) return;
    const next = !this.isSelected(id);
    this.toggleSelection(id, next);
  }

  // toggle chọn khi click body clone (không lan lên parent)
  onCloneCardClick(ev: MouseEvent, clone: any): void {
    const target = ev.target as HTMLElement;
    // bỏ qua khi click vào control
    if (target.closest('button, .btn, a, .form-check-input, .item-checkbox, .mat-mdc-slide-toggle')) return;

    ev.stopPropagation(); // ngăn parent card nhận click
    const next = !this.isCloneSelected(clone.id);
    if (next) this.selectedIds.add(clone.id); else this.selectedIds.delete(clone.id);
  }

  /** kiểm tra đã chọn toàn bộ danh sách theo bộ lọc hiện tại */
  isAllListSelected(): boolean {
    const listIds = new Set(this.filteredQuestions.map(q => q.id));
    if (listIds.size === 0) return false;
    if (this.selectedIds.size !== listIds.size) return false;
    for (const id of listIds) if (!this.selectedIds.has(id)) return false;
    return true;
  }

  /** bỏ chọn toàn bộ mục trong trang hiện tại */
  unselectCurrentPage(): void {
    for (const q of this.paginatedQuestions) this.selectedIds.delete(q.id);
  }

  /** xử lý dropdown chọn tất cả với logic loại trừ page/list */
  onSelectAllDropdown(scope: 'page' | 'list'): void {
    if (scope === 'page') {
      if (this.isAllListSelected()) {
        // đang chọn toàn bộ list -> chuyển sang chỉ chọn trang
        this.clearSelection();
        this.toggleSelectAllOnPage(true);
        return;
      }
      if (this.areAllOnPageSelected()) {
        // đang chọn trọn trang -> bấm nữa thì bỏ chọn trang
        this.unselectCurrentPage();
      } else {
        // chọn trọn trang, và loại trừ các chọn khác
        this.clearSelection();
        this.toggleSelectAllOnPage(true);
      }
    } else {
      // scope === 'list'
      if (this.isAllListSelected()) {
        // đang chọn toàn bộ list -> bấm nữa thì bỏ chọn hết
        this.clearSelection();
      } else {
        // chọn toàn bộ list, và loại trừ các chọn khác
        this.clearSelection();
        this.selectAllList(); // đã sửa thành exclusive ở dưới
      }
    }
  }

  // === Trạng thái đã chọn: MAIN vs CLONE ===
  areAllMainsOnPageSelected(): boolean {
    const page = this.paginatedQuestions || [];
    return page.length > 0 && page.every(q => this.selectedIds.has(q.id));
  }

  isAllMainsListSelected(): boolean {
    const ids = this.filteredQuestions.map(q => q.id);
    if (!ids.length) return false;
    return ids.every(id => this.selectedIds.has(id));
  }

  areAllClonesOnPageSelected(): boolean {
    const page = this.paginatedQuestions || [];
    let total = 0, hit = 0;
    for (const q of page) {
      const st = this.clonesState[q.id];
      if (!st || !st.items?.length) continue;
      total += st.items.length;
      for (const c of st.items) if (this.selectedIds.has(c.id)) hit++;
    }
    return total > 0 && hit === total;
  }

  isAllClonesListSelected(): boolean {
    // Lưu ý: chỉ đếm clones đã có trong state (những bản chưa load sẽ không tính)
    const all = Object.values(this.clonesState).flatMap(st => st?.items || []);
    if (!all.length) return false;
    return all.every(c => this.selectedIds.has(c.id));
  }

  // === Thao tác chọn: exclusive theo scope/kind ===
  private selectMainsOnPage(): void {
    this.selectedIds.clear();
    for (const q of this.paginatedQuestions) this.selectedIds.add(q.id);
  }
  private unselectMainsOnPage(): void {
    for (const q of this.paginatedQuestions) this.selectedIds.delete(q.id);
  }
  private selectMainsList(): void {
    this.selectedIds.clear();
    for (const q of this.filteredQuestions) this.selectedIds.add(q.id);
  }
  private unselectMainsList(): void {
    for (const q of this.filteredQuestions) this.selectedIds.delete(q.id);
  }
  private selectClonesOnPage(): void {
    this.selectedIds.clear();
    for (const q of this.paginatedQuestions) {
      const st = this.clonesState[q.id];
      if (!st?.items?.length) continue;
      for (const c of st.items) this.selectedIds.add(c.id);
    }
  }
  private unselectClonesOnPage(): void {
    for (const q of this.paginatedQuestions) {
      const st = this.clonesState[q.id];
      if (!st?.items?.length) continue;
      for (const c of st.items) this.selectedIds.delete(c.id);
    }
  }
  private selectClonesList(): void {
    this.selectedIds.clear();
    for (const st of Object.values(this.clonesState)) {
      for (const c of (st?.items || [])) this.selectedIds.add(c.id);
    }
  }
  private unselectClonesList(): void {
    for (const st of Object.values(this.clonesState)) {
      for (const c of (st?.items || [])) this.selectedIds.delete(c.id);
    }
  }

  // === Entry point dropdown: scope ('page'|'list'), kind ('main'|'clone') ===
  onSelectAllScope(scope: 'page' | 'list', kind: 'main' | 'clone'): void {
    if (scope === 'page' && kind === 'main') {
      this.areAllMainsOnPageSelected() ? this.unselectMainsOnPage() : this.selectMainsOnPage();
    } else if (scope === 'list' && kind === 'main') {
      this.isAllMainsListSelected() ? this.unselectMainsList() : this.selectMainsList();
    } else if (scope === 'page' && kind === 'clone') {
      this.areAllClonesOnPageSelected() ? this.unselectClonesOnPage() : this.selectClonesOnPage();
    } else {
      this.isAllClonesListSelected() ? this.unselectClonesList() : this.selectClonesList();
    }
  }

  // Export selected
  exportSelected(): void {
    if (this.selectedIds.size === 0) { this.showError('Bạn chưa chọn câu hỏi nào để export.'); return; }
    const ref = this.dialog.open(ExportQuestionsDialogComponent, { width: '720px', maxHeight: '90vh', data: { selectedCount: this.selectedIds.size }, autoFocus: false });
    ref.afterClosed().subscribe((opts: ExportOptions | undefined) => {
      if (!opts) return;
      const ids = Array.from(this.selectedIds);
      this.startProgress('Đang xuất file…', 'Đang đóng gói câu hỏi');
      this.questionService.exportQuestionsProgress(this.subjectId, ids, opts)
        .subscribe({
          next: (ev) => {
            switch (ev.type) {
              case HttpEventType.UploadProgress: {
                if (ev.total) this.progress = Math.round((ev.loaded / ev.total) * 30);
                else this.progress = Math.min((this.progress ?? 0) + 1, 29);
                break;
              }
              case HttpEventType.DownloadProgress: {
                if (ev.total) this.progress = 30 + Math.round((ev.loaded / ev.total) * 70);
                else this.progress = Math.min((this.progress ?? 30) + 1, 99);
                break;
              }
              case HttpEventType.Response: {
                const resp: any = ev;
                const blob = resp.body as Blob;
                const cd = resp.headers?.get?.('content-disposition') || '';
                const suggested = this.tryParseFileName(cd) || this.fallbackFileName(opts);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = suggested; a.click(); URL.revokeObjectURL(url);
                this.progress = 100; this.showSuccess('Export thành công.'); this.stopProgress(500);
                break;
              }
            }
            this.clearSelection();
          },
          error: (err) => { this.stopProgress(); this.showError('Export thất bại: ' + (err?.error?.message || 'Không xác định')); }
        });
    });
  }
  private tryParseFileName(cd: string): string | null { const m = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(cd); return m ? decodeURIComponent(m[1].replace(/"/g, '')) : null; }
  private fallbackFileName(opts: ExportOptions): string {
    const ext = opts.format === 'docx' ? 'docx' : 'pdf';
    const fallback = opts.variant === 'exam' ? 'exam' : `nhcht_${(opts.form ?? 'TU_LUAN').toLowerCase()}_${this.subjectId}`;
    const base = (opts.fileName?.trim()) ? opts.fileName.trim() : fallback;
    const safe = base.replace(/[\\/:*?"<>|]+/g, '_');
    return safe.toLowerCase().endsWith(`.${ext}`) ? safe : `${safe}.${ext}`;
  }

  // Delete selected
  deleteSelected(): void {
    if (this.selectedIds.size === 0) {
      this.showError('Bạn chưa chọn câu hỏi nào để xóa.');
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: 'Xóa các câu hỏi đã chọn?',
      text: `Số lượng: ${this.selectedIds.size}`,
      showCancelButton: true,
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy'
    }).then(result => {
      if (!result.isConfirmed) return;

      const ids = Array.from(this.selectedIds);

      // Bật overlay rõ ràng cho bulk
      this.setLoadingText('Đang xóa các câu hỏi…', 'Vui lòng đợi trong giây lát');
      this.isLoading = true;

      from(ids).pipe(
        // với mỗi id, gọi API và chuẩn hóa kết quả về boolean
        concatMap(id =>
          this.questionService.deleteQuestion(this.subjectId, id).pipe(
            // nếu DELETE trả về gì cũng map về true
            // (vì thành công thường không có body - 204 No Content)
            // nếu lỗi, trả về false để không làm fail cả stream
            concatMap(() => of(true)),
            catchError(() => of(false))
          )
        ),
        toArray() // nhận về mảng boolean cùng chiều với ids
      ).subscribe({
        next: (flags) => {
          // Lọc các id đã xóa OK theo flags
          const okIds: number[] = ids.filter((_, i) => flags[i] === true);
          const failed = ids.length - okIds.length;

          // Cập nhật danh sách & trang
          if (okIds.length > 0) {
            this.questions = this.questions.filter(q => !okIds.includes(q.id));
            this.updateDataSource(true);
          }

          this.clearSelection();
          this.isLoading = false;

          if (failed === 0) {
            this.showSuccess(`Đã xóa ${okIds.length} câu hỏi.`);
          } else if (okIds.length === 0) {
            this.showError('Không xóa được mục nào. Vui lòng thử lại.');
          } else {
            this.showSuccess(`Đã xóa ${okIds.length} câu hỏi. Lỗi ${failed}.`);
          }
        },
        error: () => {
          // hầu như không vào đây vì đã catch từng phần tử
          this.isLoading = false;
          this.showError('Có lỗi khi xoá các câu hỏi đã chọn.');
        }
      });
    });
  }

  // Import preview
  async openImportDryRun(): Promise<void> {
    const { UploadQuestionsDialogComponent } = await import('../upload-questions-dialog/upload-questions-dialog.component');
    const ref = this.dialog.open(UploadQuestionsDialogComponent, { 
      width: '560px', maxHeight: '90vh', 
      data: { accept: '.docx,.pdf', maxSizeMb: 20, defaultSaveCopy: false }, 
      autoFocus: false, panelClass: 'rounded-dialog' 
    });

    ref.afterClosed().subscribe(res => {
      if (!res) return;
      const { file, saveCopy } = res;
      const labels: ('PRACTICE' | 'EXAM')[] = this.labelFilter === 'EXAM' ? ['EXAM'] : ['PRACTICE'];

      this.startProgress('Đang tải file lên…', 'Đang trích xuất câu hỏi từ tệp');
      this.questionService.importPreviewProgress(this.subjectId, file, saveCopy, labels)
        .subscribe({
          next: (ev) => {
            switch (ev.type) {
              case HttpEventType.UploadProgress: {
                const total = (ev as any).total;
                const up = total ? Math.round(((ev as any).loaded / total) * 30) : Math.min((this.progress ?? 0) + 1, 29);
                this.progress = Math.max(up, this.progress ?? 0);
                if (up >= 30) this.startRamp(); // bắt đầu ramp khi xong upload (hoặc gần xong)
                break;
              }
              case HttpEventType.Response: {
                this.stopRamp();
                this.progress = 100;
                const preview = (ev as any).body;
                const dref = this.dialog.open(ImportPreviewDialogComponent, {
                  width: '1100px',
                  maxHeight: '90vh',
                  data: { subjectId: this.subjectId, preview, saveCopy },
                  autoFocus: false
                });
                dref.afterOpened().subscribe(() => this.stopProgress());
                dref.afterClosed().subscribe((r) => {
                  if (r?.committed) {
                    this.showSuccess(`Đã tải câu hỏi xong: ${r.result?.success}/${r.result?.total}`);
                    this.loadQuestions();
                  }
                });
                break;
              }
            }
          },
          error: (err) => {
            this.stopRamp();
            this.stopProgress();
            this.showError('Bản xem trước lỗi: ' + (err?.error?.message || 'Không xác định'));
          }
        });
    });
  }

  // Clone flow
  stateOf(id: number): CloneState { return this.clonesState[id] ?? { items: [], open: false, loading: false }; }
  openClonePrompt(q: any) {
    Swal.fire({
      title: `Nhân bản câu hỏi #${q.id}`,
      html: `
        <div class="text-start">
          <label class="form-label">Số lượng bản sao</label>
          <input id="cloneCount" type="number" class="swal2-input" value="1" min="1" step="1" style="max-width:200px">
          <div class="form-check mt-2">
            <input id="copyImages" class="form-check-input" type="checkbox" checked>
            <label for="copyImages" class="form-check-label">Sao chép hình ảnh</label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Tạo',
      cancelButtonText: 'Hủy',
      focusConfirm: false,
      preConfirm: () => {
        const count = Number((document.getElementById('cloneCount') as HTMLInputElement).value || '1');
        const copyImages = (document.getElementById('copyImages') as HTMLInputElement).checked;
        if (!Number.isFinite(count) || count < 1) { Swal.showValidationMessage('Số lượng phải ≥ 1'); return false; }
        return { count, copyImages };
      }
    }).then(res => {
      if (!res.isConfirmed) return;
      const { count, copyImages } = res.value as { count: number; copyImages: boolean };
      const req = { count, copyImages };
      this.questionService.cloneQuestion(this.subjectId, q.id, req).pipe(withLoading(v => this.isLoading = v))
        .subscribe({
          next: async (clones) => {
            const editable = (clones || []).map((c: any) => ({ ...c, answer: c.questionType === 'MULTIPLE_CHOICE' ? '' : c.answer, answerText: c.questionType === 'ESSAY' ? '' : c.answerText }));
            const { CloneQuickEditDialogComponent } = await import('../clone-quick-edit-dialog/clone-quick-edit-dialog.component');
            this.dialog.open(CloneQuickEditDialogComponent, { width: '1000px', maxHeight: '90vh', data: { subjectId: this.subjectId, clones: editable }, autoFocus: false })
              .afterClosed().subscribe((updatedList?: any[]) => {
                if (!updatedList) return;
                const st = this.clonesState[q.id];
                if (st?.open) {
                  st.loading = true;
                  this.questionService.getClones(this.subjectId, q.id).subscribe({ next: list => { st.items = (list || []).map(x => this.normalize(x)); st.loading = false; }, error: () => { st.loading = false; } });
                }
                this.showSuccess(`Đã lưu ${updatedList.length} bản sao.`);
              });
          },
          error: (err) => this.showError(err?.error?.message || 'Tạo bản sao thất bại')
        });
    });
  }

  toggleClones(q: any) {
    const st = this.clonesState[q.id] ?? (this.clonesState[q.id] = { items: [], open: false, loading: false });
    if (!st.open) {
      st.open = true;
      if (!st.items.length) {
        st.loading = true;
        this.questionService.getClones(this.subjectId, q.id).subscribe({ next: list => { st.items = (list || []).map(x => this.normalize(x)); st.loading = false; }, error: () => { st.loading = false; } });
      }
    } else st.open = false;
  }
  openEditCloneDialog(clone: any) {
    const ref = this.dialog.open(QuestionEditDialogComponent, { width: '720px', maxHeight: '90vh', data: { subjectId: this.subjectId, mode: 'edit', question: clone }, autoFocus: false });
    ref.afterClosed().subscribe((q) => {
      if (!q) return;
      const pid = q.parentId;
      const st = this.clonesState[pid];
      if (!st) return;
      const idx = st.items.findIndex(x => x.id === q.id);
      if (idx !== -1) st.items[idx] = this.normalize(q);
      this.showSuccess('Cập nhật bản sao thành công');
    });
  }
  deleteClone(clone: any) {
    Swal.fire({ title: `Xóa bản sao #${clone.parentId}.${clone.cloneIndex}?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Xóa', cancelButtonText: 'Hủy' })
      .then(res => {
        if (!res.isConfirmed) return;
        this.setLoadingText('Đang xóa bản sao…', 'Vui lòng đợi trong giây lát');
        this.questionService.deleteQuestion(this.subjectId, clone.id).pipe(withLoading(v => this.isLoading = v))
          .subscribe({
            next: () => {
              const st = this.clonesState[clone.parentId];
              if (st) {
                const idx = st.items.findIndex(x => x.id === clone.id);
                if (idx !== -1) st.items.splice(idx, 1);
              }
              this.showSuccess('Đã xóa bản sao');
            },
            error: (err) => this.showError(err?.error?.message || 'Xóa thất bại')
          });
      });
  }

  // UI toasts
  showSuccess(message: string): void { this.snackBar.open(message, 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-success']}); }
  showError(message: string): void { this.snackBar.open(message, 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error']}); }
}
