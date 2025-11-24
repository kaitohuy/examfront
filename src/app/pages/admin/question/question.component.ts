import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';

import { sharedImports } from '../../../shared/shared-imports';
import { withLoading } from '../../../shared/with-loading';
import {
  QuestionService,
  Page as SpringPage,
  QuestionListOpts,
  LabelBE,
  QuestionTypeBE,
  DifficultyBE,
  BulkSelectionRequest,
} from '../../../services/question.service';
import { LoginService } from '../../../services/login.service';
import {
  QuestionEvent,
  QuestionEventsService,
} from '../../../services/question-events.service';
import { ImportPreviewDialogComponent } from '../import-preview-dialog/import-preview-dialog.component';
import { ExportOptions } from '../../../models/exportOptions';
import { ExportQuestionsDialogComponent } from '../export-questions-dialog/export-questions-dialog.component';
import { QuestionEditDialogComponent } from '../question-edit-dialog/question-edit-dialog.component';
import { LoadingScreenComponent } from '../../loading-screen/loading-screen.component';
import { MathjaxDirective } from '../../../shared/mathjax.directive';
import { AutoGenRequest, AutogenService } from '../../../services/autogen.service';
import { Router } from '@angular/router';

type CloneState = { items: any[]; open: boolean; loading: boolean };

@Component({
  selector: 'app-question',
  standalone: true,
  imports: [
    ...sharedImports,
    MatPaginatorModule,
    MatDialogModule,
    LoadingScreenComponent,
    MathjaxDirective,
  ],
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.css'],
})
export class QuestionComponent implements OnInit, OnDestroy {
  // ========= Inputs =========
  @Input() subjectId!: number;
  @Input() departmentId?: number;
  @Input() labelFilter: 'ALL' | 'PRACTICE' | 'EXAM' = 'ALL';
  @Input() requireHeadForAnswers = false;
  @Input() trashMode = false;

  // ========= Loading / Overlay =========
  isLoading = false;
  loadingTitle = 'Vui lòng đợi trong giây lát';
  loadingSubtitle = 'Đang chuyển hướng tới trang đích...';
  showProgressBar = false;
  progress: number | null = null;

  // ========= Server state =========
  questions: any[] = [];
  paginatedQuestions: any[] = []; // alias cho HTML cũ
  totalItems = 0;

  // ========= Clones cache =========
  clonesState: Partial<Record<number, CloneState>> = {};

  // ========= Role =========
  isAdminOrHead = false;

  // ========= Active filters (đẩy lên BE) =========
  searchText = '';
  filterDifficulty: '' | DifficultyBE = '';
  filterChapter: number | null = null;
  filterQuestionType: '' | QuestionTypeBE = '';
  filterCreatedBy = '';
  filterDateRange: { from: Date | null; to: Date | null } = {
    from: null,
    to: null,
  };
  filterFlagged: boolean | null = null;

  // ========= Pending filters (dropdown) =========
  pendingFilters = {
    difficulty: '' as '' | DifficultyBE,
    chapter: null as number | null,
    type: '' as '' | QuestionTypeBE,
    createdBy: '',
    from: null as Date | null,
    to: null as Date | null,
    flagged: null as boolean | null,
  };

  // ========= Server-side paging =========
  pageSize = 5;
  pageSizeOptions = [5, 10, 15, 20];
  currentPage = 0;
  private readonly defaultSort = 'createdAt,desc;id,desc';

  // ========= Answers visibility =========
  showAnswers = false;

  // ========= Selection =========
  /** Chế độ chọn theo ID (truyền thẳng ids) */
  selectedIds = new Set<number>();
  /** Chế độ “chọn tất cả theo filter” -> dùng excludedIds để bỏ chọn từng phần tử */
  excludedIds = new Set<number>();
  /** Bật khi người dùng “Chọn danh sách (bản chính)” */
  selectAllMatching = false;

  // ========= Import ramp (UI only) =========
  private rampId?: number;
  private rampStart = 0;
  private rampTarget = 95;
  private rampDuration = 3000;

  // ========= Internals =========
  private eventsSub?: Subscription;
  private searchTimeoutId?: number;
  @ViewChild(MatPaginator, { static: false }) paginator?: MatPaginator;

  constructor(
    private questionService: QuestionService,
    private loginService: LoginService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private qevents: QuestionEventsService,
    private el: ElementRef,
    private autogen: AutogenService,
    private router: Router,
    private login: LoginService
  ) { }

  // ========= Lifecycle =========
  ngOnInit(): void {
    this.checkUserRole();
    this.loadQuestions();
    this.eventsSub = this.qevents.changed$.subscribe((e) => {
      if (e.subjectId === this.subjectId) this.applyEvent(e);
    });
  }

  ngOnDestroy(): void {
    this.eventsSub?.unsubscribe();
    if (this.searchTimeoutId) clearTimeout(this.searchTimeoutId);
  }

  // ========= Loading helpers =========
  reloadPage() {
    window.location.reload();
  }
  private setLoadingText(title?: string, subtitle?: string) {
    if (title !== undefined) this.loadingTitle = title;
    if (subtitle !== undefined) this.loadingSubtitle = subtitle;
  }
  private resetLoadingText() {
    this.loadingTitle = 'Vui lòng đợi trong giây lát';
    this.loadingSubtitle = 'Đang chuyển hướng tới trang đích...';
  }
  private startProgress(title: string, subtitle: string, indeterminate = false) {
    this.loadingTitle = title;
    this.loadingSubtitle = subtitle;
    this.isLoading = true;
    this.showProgressBar = true;
    this.progress = indeterminate ? null : 0;
  }
  private stopProgress(delayMs = 0) {
    const stop = () => {
      this.isLoading = false;
      this.showProgressBar = false;
      this.progress = null;
      this.resetLoadingText();
    };
    delayMs > 0 ? setTimeout(stop, delayMs) : stop();
  }

  // ========= Role =========
  private checkUserRole(): void {
    const role = this.loginService.getUserRole();
    this.isAdminOrHead = role === 'ADMIN' || role === 'HEAD';
  }

  // ========= Server-side data load =========
  private buildListOpts(): QuestionListOpts {
    const labels = this.labelFilter !== 'ALL' ? [this.labelFilter] : undefined;
    return {
      labels,
      q: (this.searchText || '').trim() || undefined,
      difficulty: this.filterDifficulty || undefined,
      chapter: this.filterChapter ?? undefined,
      type: this.filterQuestionType || undefined,
      createdBy: (this.filterCreatedBy || '').trim() || undefined,
      from: this.filterDateRange.from || undefined,
      to: this.filterDateRange.to || undefined,
      page: this.currentPage,
      size: this.pageSize,
      sort: this.defaultSort,
      flagged: this.filterFlagged,           // NEW
    };
  }

  /** Lấy object filter **không** chứa page/size/sort để gửi lên BE khi mode=FILTER */
  private buildFilterOnly(): QuestionListOpts {
    const full = this.buildListOpts();
    const { labels, q, difficulty, chapter, type, createdBy, from, to, flagged } = full;
    const result = {
      labels, q, difficulty, chapter, type, createdBy, from, to, flagged,
      deleted: this.trashMode ? true : undefined
    };
    console.log('buildFilterOnly result:', result);
    return result;
  }

  /** Helper: payload selection gửi BE (IDS | FILTER + excludeIds) */
  private buildSelectionRequest(): BulkSelectionRequest {
    if (this.selectAllMatching) {
      return {
        mode: 'FILTER',
        filter: this.buildFilterOnly(),
        excludeIds: Array.from(this.excludedIds),
      };
    }
    return { mode: 'IDS', ids: Array.from(this.selectedIds) };
  }

  // loadQuestions(): void {
  //   const opts = this.buildListOpts();
  //   this.questionService
  //     .getQuestionsPage(this.subjectId, opts)
  //     .pipe(withLoading((v) => (this.isLoading = v)))
  //     .subscribe({
  //       next: (page: SpringPage<any>) => {
  //         const data = (page?.content || []).map((q: any) => ({
  //           ...q,
  //           chapter: q.chapter != null ? Number(q.chapter) : null,
  //           labels: Array.isArray(q.labels) ? q.labels : [],
  //         }));
  //         this.questions = data;
  //         this.paginatedQuestions = data;
  //         this.totalItems = page?.totalElements ?? data.length;

  //         // Nếu filter mới khiến trang hiện tại rỗng → nhảy về trang 0
  //         if (this.totalItems > 0 && this.questions.length === 0 && this.currentPage > 0) {
  //           this.currentPage = 0;
  //           this.loadQuestions();
  //           return;
  //         }
  //         this.checkAuthorization();
  //       },
  //       error: (err) =>
  //         this.showError(
  //           'Lỗi khi tải danh sách câu hỏi: ' +
  //           (err.error?.message || 'Không xác định')
  //         ),
  //     });
  // }

  private loadQuestions(): void {
    const opts = this.buildListOpts();
    const src$ = this.trashMode
      ? this.questionService.getDeletedQuestionsPage(this.subjectId, opts)
      : this.questionService.getQuestionsPage(this.subjectId, opts);

    src$.pipe(withLoading((v) => (this.isLoading = v))).subscribe({
      next: (page) => {
        const data = (page?.content || []).map((q: any) => ({
          ...q,
          chapter: q.chapter != null ? Number(q.chapter) : null,
          labels: Array.isArray(q.labels) ? q.labels : [],
        }));
        this.questions = data;
        this.paginatedQuestions = data;
        this.totalItems = page?.totalElements ?? data.length;

        if (this.totalItems > 0 && this.questions.length === 0 && this.currentPage > 0) {
          this.currentPage = 0;
          this.loadQuestions(); return;
        }
        this.checkAuthorization();
      },
      error: (err) => this.showError('Lỗi khi tải danh sách câu hỏi: ' + (err.error?.message || 'Không xác định')),
    });
  }

  // ========= Event bus =========
  private applyEvent(e: QuestionEvent) {
    switch (e.action) {
      case 'delete': {
        this.loadQuestions();
        // dọn trong cache clones (nếu đang mở)
        for (const k of Object.keys(this.clonesState)) {
          const st = this.clonesState[+k];
          if (!st) continue;
          const i = st.items.findIndex((x) => x.id === e.id);
          if (i !== -1) st.items.splice(i, 1);
        }
        return;
      }
      case 'create':
      case 'update': {
        this.loadQuestions();
        return;
      }
    }
  }

  // ========= Filters summary (active) =========
  get activeFilterSummaryParts(): string[] {
    const parts: string[] = [];
    if (this.filterDifficulty) parts.push(`Độ khó: ${this.filterDifficulty}`);
    if (this.filterChapter !== null && this.filterChapter !== undefined)
      parts.push(`Chương: ${this.filterChapter}`);
    if (this.filterQuestionType)
      parts.push(
        `Loại: ${this.filterQuestionType === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : 'Tự luận'
        }`
      );
    if (this.filterCreatedBy) parts.push(`Người tạo: ${this.filterCreatedBy}`);
    const from = this.filterDateRange.from,
      to = this.filterDateRange.to;
    if (from || to) {
      const fmt = (d: Date) => new Date(d).toLocaleDateString();
      parts.push(`Thời gian: ${from ? fmt(from) : '…'} → ${to ? fmt(to) : '…'}`);
    }
    const q = (this.searchText || '').trim();
    if (q) parts.push(`Tìm: "${q}"`);
    if (this.filterFlagged !== null && this.filterFlagged !== undefined) {
      parts.push(`Báo lỗi: ${this.filterFlagged ? 'Chỉ bị báo lỗi' : 'Không bị báo lỗi'}`);
    }
    return parts;
  }

  openFlagPrompt(q: any) {
    Swal.fire({
      title: `Gỡ báo lỗi câu hỏi ${this.getCode(q)}?`,
      input: 'textarea',
      inputLabel: 'Lý do',
      inputPlaceholder: 'Mô tả ngắn gọn vấn đề…',
      inputAttributes: { maxlength: '2000' },
      inputValidator: (val) => {
        if (!val || val.trim().length < 5) return 'Vui lòng nhập tối thiểu 5 ký tự';
        return null;
      },
      showCancelButton: true,
      confirmButtonText: 'Gửi báo lỗi',
      cancelButtonText: 'Hủy'
    }).then(res => {
      if (!res.isConfirmed) return;
      this.isLoading = true;
      this.setLoadingText('Đang gửi báo lỗi…', 'Vui lòng đợi trong giây lát');
      this.questionService.flagQuestion(this.subjectId, q.id, res.value.trim())
        .subscribe({
          next: () => {
            q.flagged = true; // cập nhật ngay UI
            this.showSuccess('Đã báo lỗi. HEAD sẽ xem xét.');
            this.isLoading = false;
            this.resetLoadingText();
          },
          error: (err) => {
            this.isLoading = false;
            this.showError(err?.error?.message || 'Báo lỗi thất bại');
          }
        });
    });
  }

  unflagQuestion(q: any) {
    Swal.fire({
      title: `Gỡ báo lỗi câu hỏi #${q.id}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Gỡ lỗi',
      cancelButtonText: 'Hủy'
    }).then(res => {
      if (!res.isConfirmed) return;
      this.isLoading = true;
      this.setLoadingText('Đang gỡ báo lỗi…', 'Vui lòng đợi trong giây lát');
      this.questionService.unflagQuestion(this.subjectId, q.id)
        .subscribe({
          next: () => {
            q.flagged = false;
            this.showSuccess('Đã gỡ báo lỗi.');
            this.isLoading = false;
            this.resetLoadingText();
          },
          error: (err) => {
            this.isLoading = false;
            this.showError(err?.error?.message || 'Gỡ lỗi thất bại');
          }
        });
    });
  }

  // ========= Filters: clear/apply/sync =========
  clearAllFilters(): void {
    this.searchText = '';
    this.filterDifficulty = '';
    this.filterChapter = null;
    this.filterQuestionType = '';
    this.filterCreatedBy = '';
    this.filterDateRange = { from: null, to: null };
    this.syncPendingFromActive();
    this.currentPage = 0;
    this.clearSelection(); // IMPORTANT
    this.loadQuestions();
    queueMicrotask(() => this.paginator?.firstPage());
  }

  syncPendingFromActive(): void {
    this.pendingFilters = {
      difficulty: this.filterDifficulty || '',
      chapter: this.filterChapter,
      type: this.filterQuestionType || '',
      createdBy: this.filterCreatedBy || '',
      from: this.filterDateRange.from,
      to: this.filterDateRange.to,
      flagged: this.filterFlagged,
    };
  }

  applyPendingFilters(): void {
    this.filterDifficulty = this.pendingFilters.difficulty || '';
    this.filterChapter = this.pendingFilters.chapter;
    this.filterQuestionType = this.pendingFilters.type || '';
    this.filterCreatedBy = this.pendingFilters.createdBy || '';
    this.filterDateRange = { from: this.pendingFilters.from, to: this.pendingFilters.to };
    this.filterFlagged = this.pendingFilters.flagged ?? null;
    this.currentPage = 0;
    this.clearSelection();
    this.loadQuestions();
    queueMicrotask(() => this.paginator?.firstPage());
  }

  resetPendingFilters(): void {
    this.pendingFilters = {
      difficulty: '',
      chapter: null,
      type: '',
      createdBy: '',
      from: null,
      to: null,
      flagged: null,
    };
  }

  cancelPendingChanges(): void {
    this.syncPendingFromActive();
  }

  hasPendingChanges(): boolean {
    return (
      this.pendingFilters.difficulty !== (this.filterDifficulty || '') ||
      this.pendingFilters.chapter !== this.filterChapter ||
      this.pendingFilters.type !== (this.filterQuestionType || '') ||
      this.pendingFilters.createdBy !== (this.filterCreatedBy || '') ||
      this.pendingFilters.from?.getTime() !== this.filterDateRange.from?.getTime() ||
      this.pendingFilters.to?.getTime() !== this.filterDateRange.to?.getTime() ||
      this.pendingFilters.flagged !== this.filterFlagged
    );
  }

  getPendingChangesSummary(): string {
    const changes: string[] = [];
    if (this.pendingFilters.difficulty !== (this.filterDifficulty || ''))
      changes.push(`Độ khó: ${this.pendingFilters.difficulty || 'Tất cả'}`);
    if (this.pendingFilters.chapter !== this.filterChapter)
      changes.push(
        `Chương: ${this.pendingFilters.chapter === null ? 'Tất cả' : this.pendingFilters.chapter
        }`
      );
    if (this.pendingFilters.type !== (this.filterQuestionType || ''))
      changes.push(
        `Loại: ${this.pendingFilters.type === 'MULTIPLE_CHOICE'
          ? 'Trắc nghiệm'
          : this.pendingFilters.type === 'ESSAY'
            ? 'Tự luận'
            : 'Tất cả'
        }`
      );
    if (this.pendingFilters.createdBy !== (this.filterCreatedBy || ''))
      changes.push(`Người tạo: ${this.pendingFilters.createdBy || '(trống)'}`);
    const fromChanged =
      this.pendingFilters.from?.getTime() !== this.filterDateRange.from?.getTime();
    const toChanged =
      this.pendingFilters.to?.getTime() !== this.filterDateRange.to?.getTime();
    if (fromChanged || toChanged) {
      const fromVal = this.pendingFilters.from
        ? this.pendingFilters.from.toLocaleDateString()
        : '…';
      const toVal = this.pendingFilters.to
        ? this.pendingFilters.to.toLocaleDateString()
        : '…';
      changes.push(`Thời gian: ${fromVal} → ${toVal}`);
    }
    if (this.pendingFilters.flagged !== this.filterFlagged) {
      const v = this.pendingFilters.flagged;
      changes.push(`Báo lỗi: ${v === null ? 'Tất cả' : v ? 'Chỉ bị báo lỗi' : 'Không bị báo lỗi'}`);
    }
    return changes.join(', ');
  }

  // ========= Dropdown helpers =========
  applyPendingFiltersAndClose(dropdownElement: HTMLElement): void {
    this.applyPendingFilters();
    this.closeDropdown(dropdownElement);
  }

  closeDropdown(dropdownElement: HTMLElement): void {
    try {
      const Dropdown = (window as any).bootstrap?.Dropdown;
      if (Dropdown) {
        const inst = Dropdown.getOrCreateInstance(dropdownElement);
        inst.hide();
        return;
      }
    } catch { }
    const menu = dropdownElement.parentElement?.querySelector(
      '.dropdown-menu'
    ) as HTMLElement | null;
    if (menu?.classList.contains('show')) {
      menu.classList.remove('show');
      dropdownElement.setAttribute('aria-expanded', 'false');
    }
  }

  onDatepickerClosed(event: any): void {
    event?.stopPropagation?.();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const target = ev.target as Element;
    const clickedInsideDropdown = !!target.closest('.dropdown-menu, .dropdown-toggle');
    const clickedOnMatOverlay = !!target.closest('.cdk-overlay-container');
    if (!clickedInsideDropdown && !clickedOnMatOverlay) {
      const toggler: HTMLElement | null =
        this.el.nativeElement.querySelector('.dropdown-toggle');
      if (toggler && toggler.getAttribute('aria-expanded') === 'true')
        this.closeDropdown(toggler);
    }
  }

  // ========= Search debounce =========
  onSearchInput(): void {
    if (this.searchTimeoutId) clearTimeout(this.searchTimeoutId);
    this.searchTimeoutId = window.setTimeout(() => {
      this.currentPage = 0;
      this.loadQuestions();
    }, 300);
  }

  // ========= Server paging =========
  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadQuestions();
  }

  // ========= Answers auth =========
  checkAuthorization(): void {
    if (!this.requireHeadForAnswers) return;
    if (!this.isAdminOrHead && this.showAnswers) {
      Swal.fire({
        title: 'Yêu cầu cấp quyền',
        text: 'Bạn cần HEAD/ADMIN cấp quyền để hiển thị đáp án câu hỏi thi.',
        icon: 'warning',
        confirmButtonText: 'Đã hiểu',
      }).then(() => (this.showAnswers = false));
    }
  }

  // ========= CRUD dialogs =========
  openCreateQuestionDialog(): void {
    const ref = this.dialog.open(QuestionEditDialogComponent, {
      width: '720px',
      maxHeight: '90vh',
      data: { subjectId: this.subjectId, mode: 'create' },
      autoFocus: false,
    });
    ref.afterClosed().subscribe((q) => {
      if (!q) return;
      this.showSuccess('Đã tạo câu hỏi.');
      this.currentPage = 0;
      this.loadQuestions();
    });
  }

  openEditQuestionDialog(question: any): void {
    const ref = this.dialog.open(QuestionEditDialogComponent, {
      width: '720px',
      maxHeight: '90vh',
      data: { subjectId: this.subjectId, mode: 'edit', question },
      autoFocus: false,
    });
    ref.afterClosed().subscribe((q) => {
      if (!q) return;
      this.showSuccess('Cập nhật câu hỏi thành công');
      this.loadQuestions();
    });
  }

  deleteQuestion(questionId: number): void {
    const q = this.questions.find(x => x.id === questionId);
    const codeText = q ? this.getCode(q) : `#${questionId}`;
    Swal.fire({
      title: 'Xác nhận xóa',
      text: `Bạn có chắc chắn muốn xóa ${codeText}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.setLoadingText('Đang xóa câu hỏi…', 'Vui lòng đợi trong giây lát');
      this.isLoading = true;
      this.questionService
        .deleteQuestion(this.subjectId, questionId)
        .pipe(withLoading((v) => (this.isLoading = v)))
        .subscribe({
          next: () => {
            this.showSuccess('Xóa câu hỏi thành công');
            this.loadQuestions();
          },
          error: (err) =>
            this.showError(
              'Lỗi khi xóa câu hỏi: ' + (err.error?.message || 'Không xác định')
            ),
        });
    });
  }

  // ========= Selection (main items) =========
  /** Tổng số item đã chọn (kể cả chế độ select-all) */
  get selectedCount(): number {
    return this.selectAllMatching
      ? Math.max(0, (this.totalItems || 0) - this.excludedIds.size)
      : this.selectedIds.size;
  }

  /** Item có đang được chọn không (tôn trọng cả select-all + excludedIds) */
  isSelected(id: number): boolean {
    return this.selectAllMatching
      ? !this.excludedIds.has(id)
      : this.selectedIds.has(id);
  }

  /** Reset toàn bộ lựa chọn */
  clearSelection() {
    this.selectedIds.clear();
    this.excludedIds.clear();
    this.selectAllMatching = false;
  }

  /** Chọn/bỏ chọn một item theo mode hiện tại */
  onItemSelectChange(evt: Event, id: number): void {
    const checked = (evt.target as HTMLInputElement).checked;
    if (this.selectAllMatching) {
      if (checked) this.excludedIds.delete(id);
      else this.excludedIds.add(id);
    } else {
      if (checked) this.selectedIds.add(id);
      else this.selectedIds.delete(id);
    }
  }

  /** Click body card → toggle chọn */
  onCardClick(ev: MouseEvent, id: number): void {
    const target = ev.target as HTMLElement;
    if (
      target.closest('.clone-card') ||
      target.closest(
        'button, .btn, a, .form-check-input, .item-checkbox, .mat-mdc-slide-toggle'
      )
    )
      return;

    if (this.selectAllMatching) {
      const nextChecked = !this.isSelected(id);
      if (nextChecked) this.excludedIds.delete(id);
      else this.excludedIds.add(id);
    } else {
      const next = !this.selectedIds.has(id);
      if (next) this.selectedIds.add(id);
      else this.selectedIds.delete(id);
    }
  }

  trackById(index: number, q: any) {
    return q?.id;
  }

  /** “Chọn tất cả trên TRANG hiện tại” cho BẢN CHÍNH – tôn trọng mode hiện tại */
  private toggleSelectAllOnPage(checked: boolean) {
    if (this.selectAllMatching) {
      for (const q of this.paginatedQuestions) {
        if (checked) this.excludedIds.delete(q.id);
        else this.excludedIds.add(q.id);
      }
    } else {
      for (const q of this.paginatedQuestions) {
        if (checked) this.selectedIds.add(q.id);
        else this.selectedIds.delete(q.id);
      }
    }
  }

  /** Có phải tất cả item trên TRANG đã chọn chưa? (tôn trọng select-all) */
  areAllOnPageSelected(): boolean {
    const page = this.paginatedQuestions || [];
    if (!page.length) return false;
    if (this.selectAllMatching) {
      // tất cả “được chọn” nếu không có id nào của page nằm trong excludedIds
      return page.every((q) => !this.excludedIds.has(q.id));
    }
    return page.every((q) => this.selectedIds.has(q.id));
  }

  onSelectAllChange(evt: Event): void {
    const checked = (evt.target as HTMLInputElement).checked;
    this.toggleSelectAllOnPage(checked);
  }

  // ====== “Danh sách” (toàn bộ theo filter) – BẢN CHÍNH ======
  /** Bật chế độ select-all theo filter hiện tại */
  private selectMainsList(): void {
    this.selectAllMatching = true;
    this.selectedIds.clear();
    this.excludedIds.clear(); // mặc định: tất cả đều được chọn
  }

  /** Tắt chế độ select-all theo filter */
  private unselectMainsList(): void {
    this.clearSelection();
  }

  /** Đang chọn toàn bộ theo filter (không có excluded) */
  isAllMainsListSelected(): boolean {
    return this.selectAllMatching && this.excludedIds.size === 0;
  }

  /** alias cho HTML cũ */
  areAllMainsOnPageSelected(): boolean {
    return this.areAllOnPageSelected();
  }

  // ========= Clones selection (giữ theo IDs) =========
  private toggleSelectAllClonesOnPage(checked: boolean) {
    for (const q of this.paginatedQuestions) {
      const st = this.clonesState[q.id];
      if (!st?.items?.length) continue;
      for (const c of st.items) {
        if (checked) this.selectedIds.add(c.id);
        else this.selectedIds.delete(c.id);
      }
    }
  }

  areAllClonesOnPageSelected(): boolean {
    const page = this.paginatedQuestions || [];
    let total = 0,
      hit = 0;
    for (const q of page) {
      const st = this.clonesState[q.id];
      if (!st || !st.items?.length) continue;
      total += st.items.length;
      for (const c of st.items) if (this.selectedIds.has(c.id)) hit++;
    }
    return total > 0 && hit === total;
  }

  /** Legacy: “danh sách” hiện giới hạn trong các clones đã tải ở các câu đang mở */
  isAllClonesListSelected(): boolean {
    const all = this.paginatedQuestions.flatMap(
      (q) => this.clonesState[q.id]?.items || []
    );
    if (!all.length) return false;
    return all.every((c) => this.selectedIds.has(c.id));
  }

  private selectClonesOnPage(): void {
    this.toggleSelectAllClonesOnPage(true);
  }

  private unselectClonesOnPage(): void {
    this.toggleSelectAllClonesOnPage(false);
  }

  private selectClonesList(): void {
    // hiện thời = trang hiện tại (do clones tải theo từng question)
    this.selectClonesOnPage();
  }

  private unselectClonesList(): void {
    this.unselectClonesOnPage();
  }

  // ========= Entry point dropdown =========
  onSelectAllScope(scope: 'page' | 'list', kind: 'main' | 'clone'): void {
    if (scope === 'page' && kind === 'main') {
      const willSelect = !this.areAllMainsOnPageSelected();
      this.toggleSelectAllOnPage(willSelect);
      return;
    }
    if (scope === 'list' && kind === 'main') {
      this.isAllMainsListSelected()
        ? this.unselectMainsList()
        : this.selectMainsList();
      return;
    }
    if (scope === 'page' && kind === 'clone') {
      const willSelect = !this.areAllClonesOnPageSelected();
      this.toggleSelectAllClonesOnPage(willSelect);
      return;
    }
    // clones list (legacy)
    this.isAllClonesListSelected()
      ? this.unselectClonesList()
      : this.selectClonesList();
  }

  // ========= Clone selection handlers =========
  isCloneSelected(id: number): boolean {
    return this.selectedIds.has(id);
  }

  onCloneSelectChange(evt: Event, clone: any): void {
    const checked = (evt.target as HTMLInputElement).checked;
    if (checked) this.selectedIds.add(clone.id);
    else this.selectedIds.delete(clone.id);
  }

  onCloneCardClick(ev: MouseEvent, clone: any): void {
    const target = ev.target as HTMLElement;
    if (
      target.closest('button, .btn, a, .form-check-input, .item-checkbox, .mat-mdc-slide-toggle')
    )
      return;
    ev.stopPropagation();
    const next = !this.isCloneSelected(clone.id);
    if (next) this.selectedIds.add(clone.id);
    else this.selectedIds.delete(clone.id);
  }

  // ========= Export selected =========
  exportSelected(): void {
    if (this.selectedCount === 0) {
      this.showError('Bạn chưa chọn câu hỏi nào để export.');
      return;
    }

    const ref = this.dialog.open(ExportQuestionsDialogComponent, {
      width: '720px',
      maxHeight: '90vh',
      data: { selectedCount: this.selectedCount },
      autoFocus: false,
    });

    ref.afterClosed().subscribe((opts: ExportOptions | undefined) => {
      if (!opts) return;
      const selection = this.buildSelectionRequest();

      this.startProgress('Đang xuất file…', 'Đang đóng gói câu hỏi');

      this.questionService
        .exportQuestionsProgressBySelection(this.subjectId, selection, opts)
        .subscribe({
          next: (ev) => {
            switch (ev.type) {
              case HttpEventType.UploadProgress: {
                if ((ev as any).total)
                  this.progress = Math.round(
                    (((ev as any).loaded || 0) / ((ev as any).total || 1)) * 30
                  );
                else this.progress = Math.min((this.progress ?? 0) + 1, 29);
                break;
              }
              case HttpEventType.DownloadProgress: {
                if ((ev as any).total)
                  this.progress =
                    30 +
                    Math.round(
                      (((ev as any).loaded || 0) / ((ev as any).total || 1)) * 70
                    );
                else this.progress = Math.min((this.progress ?? 30) + 1, 99);
                break;
              }
              case HttpEventType.Response: {
                const resp: any = ev;
                const blob = resp.body as Blob;
                const cd = resp.headers?.get?.('content-disposition') || '';
                const suggested =
                  this.tryParseFileName(cd) || this.fallbackFileName(opts);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = suggested;
                a.click();
                URL.revokeObjectURL(url);
                this.progress = 100;
                this.showSuccess('Export thành công.');
                this.clearSelection(); // chỉ clear sau khi export thành công
                this.stopProgress(500);
                break;
              }
            }
          },
          error: (err) => {
            this.stopProgress();
            this.showError(
              'Export thất bại: ' + (err?.error?.message || 'Không xác định')
            );
          },
        });
    });
  }

  private tryParseFileName(cd: string): string | null {
    const m = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(cd);
    return m ? decodeURIComponent(m[1].replace(/"/g, '')) : null;
  }

  private fallbackFileName(opts: ExportOptions): string {
    const ext = opts.format === 'docx' ? 'docx' : 'pdf';
    const fallback =
      opts.variant === 'exam'
        ? 'exam'
        : `nhcht_${(opts.form ?? 'TU_LUAN').toLowerCase()}_${this.subjectId}`;
    const base = opts.fileName?.trim() ? opts.fileName.trim() : fallback;
    const safe = base.replace(/[\\/:*?"<>|]+/g, '_');
    return safe.toLowerCase().endsWith(`.${ext}`) ? safe : `${safe}.${ext}`;
  }

  // ========= Delete selected =========
  deleteSelected(): void {
    if (this.selectedCount === 0) {
      this.showError('Bạn chưa chọn câu hỏi nào để xóa.');
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: 'Xóa các câu hỏi đã chọn?',
      text: `Số lượng ước tính: ${this.selectedCount}`,
      showCancelButton: true,
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
    }).then((result) => {
      if (!result.isConfirmed) return;

      const selection = this.buildSelectionRequest();

      this.setLoadingText('Đang xóa các câu hỏi…', 'Vui lòng đợi trong giây lát');
      this.isLoading = true;

      this.questionService.deleteBySelection(this.subjectId, selection).subscribe({
        next: (r) => {
          if (r.deleted > 0)
            this.showSuccess(`Đã xóa ${r.deleted}/${r.requested} câu hỏi.`);
          else this.showError('Không có câu hỏi nào được xóa.');

          this.clearSelection();
          this.isLoading = false;
          this.loadQuestions();
        },
        error: () => {
          this.isLoading = false;
          this.showError('Có lỗi khi xoá các câu hỏi đã chọn.');
        },
      });
    });
  }

  // ========= Import preview =========
  private startRamp() {
    this.stopRamp();
    this.rampStart = 0;
    const tick = (t: number) => {
      if (!this.rampStart) this.rampStart = t;
      const elapsed = t - this.rampStart;
      const p = Math.min(
        this.rampTarget,
        Math.round((elapsed / this.rampDuration) * (this.rampTarget - 30)) + 30
      );
      if (typeof this.progress === 'number')
        this.progress = Math.max(this.progress, p);
      if (p < this.rampTarget) this.rampId = requestAnimationFrame(tick);
    };
    this.rampId = requestAnimationFrame(tick);
  }

  private stopRamp() {
    if (this.rampId) cancelAnimationFrame(this.rampId);
    this.rampId = undefined;
  }

  async openImportDryRun(): Promise<void> {
    const { UploadQuestionsDialogComponent } = await import(
      '../upload-questions-dialog/upload-questions-dialog.component'
    );
    const ref = this.dialog.open(UploadQuestionsDialogComponent, {
      width: '560px',
      maxHeight: '90vh',
      data: { accept: '.docx,.pdf', maxSizeMb: 20, defaultSaveCopy: false },
      autoFocus: false,
      panelClass: 'rounded-dialog',
    });

    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      const { file, saveCopy } = res;
      const labels: LabelBE[] = this.labelFilter === 'EXAM' ? ['EXAM'] : ['PRACTICE'];

      this.startProgress('Đang tải file lên…', 'Đang trích xuất câu hỏi từ tệp');
      this.questionService
        .importPreviewProgress(this.subjectId, file, saveCopy, labels)
        .subscribe({
          next: (ev) => {
            switch (ev.type) {
              case HttpEventType.UploadProgress: {
                const total = (ev as any).total;
                const up = total
                  ? Math.round((((ev as any).loaded || 0) / total) * 30)
                  : Math.min((this.progress ?? 0) + 1, 29);
                this.progress = Math.max(up, this.progress ?? 0);
                if (up >= 30) this.startRamp();
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
                  autoFocus: false,
                });
                dref.afterOpened().subscribe(() => this.stopProgress());
                dref.afterClosed().subscribe((r) => {
                  if (r?.committed) {
                    this.showSuccess(
                      `Đã tải câu hỏi xong: ${r.result?.success}/${r.result?.total}`
                    );
                    this.currentPage = 0;
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
            this.showError(
              'Bản xem trước lỗi: ' + (err?.error?.message || 'Không xác định')
            );
          },
        });
    });
  }

  // ========= Clone flow =========
  stateOf(id: number): CloneState {
    return this.clonesState[id] ?? { items: [], open: false, loading: false };
  }

  openClonePrompt(q: any) {
    Swal.fire({
      title: `Nhân bản câu hỏi ${this.getCode(q)}`,
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
        const count = Number(
          (document.getElementById('cloneCount') as HTMLInputElement).value || '1'
        );
        const copyImages = (document.getElementById('copyImages') as HTMLInputElement)
          .checked;
        if (!Number.isFinite(count) || count < 1) {
          Swal.showValidationMessage('Số lượng phải ≥ 1');
          return false;
        }
        return { count, copyImages };
      },
    }).then((res) => {
      if (!res.isConfirmed) return;
      const { count, copyImages } = res.value as { count: number; copyImages: boolean };
      const req = { count, copyImages };
      this.questionService
        .cloneQuestion(this.subjectId, q.id, req)
        .pipe(withLoading((v) => (this.isLoading = v)))
        .subscribe({
          next: async (clones) => {
            const editable = (clones || []).map((c: any) => ({
              ...c,
              answer: c.questionType === 'MULTIPLE_CHOICE' ? '' : c.answer,
              answerText: c.questionType === 'ESSAY' ? '' : c.answerText,
            }));
            const { CloneQuickEditDialogComponent } = await import(
              '../clone-quick-edit-dialog/clone-quick-edit-dialog.component'
            );
            this.dialog
              .open(CloneQuickEditDialogComponent, {
                width: '1000px',
                maxHeight: '90vh',
                data: { subjectId: this.subjectId, clones: editable },
                autoFocus: false,
              })
              .afterClosed()
              .subscribe((updatedList?: any[]) => {
                if (!updatedList) return;
                const st = this.clonesState[q.id];
                if (st?.open) {
                  st.loading = true;
                  this.questionService.getClones(this.subjectId, q.id).subscribe({
                    next: (list) => {
                      st.items = (list || []).map((x) => this.normalize(x));
                      st.loading = false;
                    },
                    error: () => {
                      st.loading = false;
                    },
                  });
                }
                this.showSuccess(`Đã lưu ${updatedList.length} bản sao.`);
              });
          },
          error: (err) =>
            this.showError(err?.error?.message || 'Tạo bản sao thất bại'),
        });
    });
  }

  toggleClones(q: any) {
    const st =
      this.clonesState[q.id] ??
      (this.clonesState[q.id] = { items: [], open: false, loading: false });
    if (!st.open) {
      st.open = true;
      if (!st.items.length) {
        st.loading = true;
        this.questionService.getClones(this.subjectId, q.id).subscribe({
          next: (list) => {
            st.items = (list || []).map((x) => this.normalize(x));
            st.loading = false;
          },
          error: () => {
            st.loading = false;
          },
        });
      }
    } else st.open = false;
  }

  openEditCloneDialog(clone: any) {
    const ref = this.dialog.open(QuestionEditDialogComponent, {
      width: '720px',
      maxHeight: '90vh',
      data: { subjectId: this.subjectId, mode: 'edit', question: clone },
      autoFocus: false,
    });
    ref.afterClosed().subscribe((q) => {
      if (!q) return;
      const pid = q.parentId;
      const st = this.clonesState[pid];
      if (!st) return;
      const idx = st.items.findIndex((x) => x.id === q.id);
      if (idx !== -1) st.items[idx] = this.normalize(q);
      this.showSuccess('Cập nhật bản sao thành công');
    });
  }

  deleteClone(clone: any) {
    Swal.fire({
      title: `Xóa bản sao ${this.getCloneCode({ id: clone.parentId, questionCode: clone.parentCode }, clone)}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.setLoadingText('Đang xóa bản sao…', 'Vui lòng đợi trong giây lát');
      this.questionService
        .deleteQuestion(this.subjectId, clone.id)
        .pipe(withLoading((v) => (this.isLoading = v)))
        .subscribe({
          next: () => {
            const st = this.clonesState[clone.parentId];
            if (st) {
              const idx = st.items.findIndex((x) => x.id === clone.id);
              if (idx !== -1) st.items.splice(idx, 1);
            }
            this.showSuccess('Đã xóa bản sao');
          },
          error: (err) => this.showError(err?.error?.message || 'Xóa thất bại'),
        });
    });
  }

  // ========= Helpers =========
  private normalize(q: any) {
    return {
      ...q,
      chapter: q?.chapter != null ? Number(q.chapter) : null,
      questionCode: q?.questionCode ?? q?.code ?? null
    };
  }

  // ========= UI toasts =========
  showSuccess(message: string): void {
    this.snackBar.open(message, 'Đóng', {
      duration: 3000,
      verticalPosition: 'top',
      horizontalPosition: 'right',
      panelClass: ['snack', 'snack-success'],
    });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Đóng', {
      duration: 3000,
      verticalPosition: 'top',
      horizontalPosition: 'right',
      panelClass: ['snack', 'snack-error'],
    });
  }

  private tryParseZipFileNameFromCD(cd: string | null | undefined, fallback: string): string {
    if (!cd) return fallback;
    const m = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(cd);
    const name = m ? decodeURIComponent(m[1].replace(/"/g, '')) : null;
    if (!name) return fallback;
    return name.toLowerCase().endsWith('.zip') ? name : `${name}.zip`;
  }

  private triggerDownload(blob: Blob, fileName: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  openAutoGenDialog() {
    const ref = this.dialog.open(ExportQuestionsDialogComponent, {
      width: '720px',
      maxHeight: '90vh',
      data: { selectedCount: 0, mode: 'autogen' },
      autoFocus: false,
    });

    ref.afterClosed().subscribe((r) => {
      if (!r || r.mode !== 'autogen') return;

      const {
        variants, fileName, variant, format,
        semester, academicYear, classes, duration, program, examForm, mau
      } = r;

      // body & query cho AutogenService
      const body = { variants: r.variants, labels: r.labels };
      const query = {
        commit: true,
        fileName,
        program, semester, academicYear, classes, duration, examForm, mau
      };

      this.startProgress('Đang sinh và đóng gói đề…', 'Đang tạo DOCX & ma trận, vui lòng đợi');

      this.autogen.exportZipProgress(this.subjectId, body, query).subscribe({
        next: (ev: any) => {
          if (ev?.type === 1) {
            if (typeof ev.total === 'number') this.progress = Math.round((ev.loaded / ev.total) * 30);
            else this.progress = Math.min((this.progress ?? 0) + 1, 29);
          } else if (ev?.type === 3) {
            if (typeof ev.total === 'number') this.progress = 30 + Math.round((ev.loaded / ev.total) * 70);
            else this.progress = Math.min((this.progress ?? 30) + 1, 99);
          } else if (ev?.type === 4) {
            const resp = ev;
            const blob = resp.body as Blob;
            const cd = resp.headers?.get?.('content-disposition') || '';
            const suggested = this.tryParseZipFileNameFromCD(cd, `${fileName || 'de_tu_dong'}.zip`);
            this.triggerDownload(blob, suggested);
            this.progress = 100;
            this.showSuccess(`Đã sinh ${variants} đề và tải ZIP về máy.`);
            this.stopProgress(500);
          }
        },
        error: (err) => {
          this.stopProgress();
          this.showError('Sinh đề tự động thất bại: ' + (err?.error?.message || 'Không xác định'));
        },
      });
    });
  }

  getCode(q: any): string {
    // Không thêm dấu # nếu đã có questionCode
    return (q?.questionCode && String(q.questionCode).trim().length > 0)
      ? String(q.questionCode).trim()
      : `#${q?.id}`;
  }

  getCloneCode(parent: any, c: any): string {
    if (c?.questionCode && String(c.questionCode).trim().length > 0) {
      return String(c.questionCode).trim();
    }
    const base = this.getCode(parent); // ưu tiên parent.questionCode nếu có
    return `${base}.${c?.cloneIndex}`;
  }

  openTrash() {
    const role = this.login.getUserRole();
    if (role == 'ADMIN') {
      this.router.navigate([
        '/admin-dashboard',
        'department', this.departmentId,
        'subjects', this.subjectId,
        'questions', 'trash',
      ]);
    }
    else if (role === 'HEAD') {
      this.router.navigate([
        '/head-dashboard',
        'department', this.departmentId,
        'subjects', this.subjectId,
        'questions', 'trash',
      ]);
    } else if (role === 'TEACHER') {
      this.router.navigate([
        '/user-dashboard',
        'subjects', this.subjectId,
        'questions', 'trash',
      ]);
    }
  }

  restore(q: any) {
    this.isLoading = true;
    this.setLoadingText('Đang khôi phục…');
    this.questionService.restoreQuestion(this.subjectId, q.id)
      .subscribe({
        next: () => { this.showSuccess('Đã khôi phục'); this.loadQuestions(); this.isLoading = false; this.resetLoadingText(); },
        error: (e) => { this.isLoading = false; this.showError(e?.error?.message || 'Khôi phục thất bại'); }
      });
  }
  purge(id: number) {
    Swal.fire({ title: 'Xoá vĩnh viễn?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Xoá', cancelButtonText: 'Hủy' })
      .then(res => {
        if (!res.isConfirmed) return;
        this.isLoading = true;
        this.setLoadingText('Đang xoá vĩnh viễn…');
        this.questionService.purgeQuestion(this.subjectId, id)
          .subscribe({
            next: () => { this.showSuccess('Đã xoá vĩnh viễn'); this.loadQuestions(); this.isLoading = false; this.resetLoadingText(); },
            error: (e) => { this.isLoading = false; this.showError(e?.error?.message || 'Xoá thất bại'); }
          });
      });
  }
  bulkRestore() {
    const sel = this.buildSelectionRequest();
    this.isLoading = true;
    this.setLoadingText('Đang khôi phục danh sách…');
    this.questionService.bulkRestore(this.subjectId, sel)
      .subscribe({
        next: (r) => { this.showSuccess(`Khôi phục ${r.restored}/${r.requested}`); this.clearSelection(); this.loadQuestions(); this.isLoading = false; this.resetLoadingText(); },
        error: () => { this.isLoading = false; this.showError('Khôi phục hàng loạt thất bại'); }
      });
  }
  bulkPurge() {
    const sel = this.buildSelectionRequest();
    console.log('bulk-purge sel =', sel);
    console.log('bulk-purge JSON =', JSON.stringify(sel));
    Swal.fire({ title: 'Xoá vĩnh viễn các câu hỏi đã chọn?', icon: 'warning', showCancelButton: true })
      .then(res => {
        if (!res.isConfirmed) return;
        this.isLoading = true;
        this.setLoadingText('Đang xoá vĩnh viễn…');
        this.questionService.bulkPurge(this.subjectId, sel)
          .subscribe({
            next: (r) => { this.showSuccess(`Đã xoá ${r.purged}/${r.requested}`); this.clearSelection(); this.loadQuestions(); this.isLoading = false; this.resetLoadingText(); },
            error: () => { this.isLoading = false; this.showError('Xoá hàng loạt thất bại'); }
          });
      });
  }

  closeTrash() {
    const role = this.login.getUserRole();
    if (role === 'HEAD') {
      this.router.navigate(['/head-dashboard', 'department', this.departmentId, 'subjects', this.subjectId]);
    } else if (role === 'TEACHER') {
      this.router.navigate(['/user-dashboard', 'subjects', this.subjectId]);
    } else {
      // fallback nếu có ADMIN dùng màn này
      this.router.navigate(['/admin-dashboard', 'department', this.departmentId, 'subjects', this.subjectId]);
    }
  }
}