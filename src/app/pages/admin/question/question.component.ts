import { Component, Input, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import Swal from 'sweetalert2';
import { sharedImports } from '../../../shared/shared-imports';
import { QuestionService } from '../../../services/question.service';
import { LoginService } from '../../../services/login.service';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ImportPreviewDialogComponent } from '../import-preview-dialog/import-preview-dialog.component';
import { ExportOptions } from '../../../models/exportOptions';
import { ExportQuestionsDialogComponent } from '../export-questions-dialog/export-questions-dialog.component';
import { QuestionEditDialogComponent } from '../question-edit-dialog/question-edit-dialog.component';
import { QuestionEvent, QuestionEventsService } from '../../../services/question-events.service';
import { Subscription, from, of } from 'rxjs';
import { catchError, concatMap, toArray } from 'rxjs/operators';

import { withLoading } from '../../../shared/with-loading';
import { LoadingScreenComponent } from '../../loading-screen/loading-screen.component';

type CloneState = { items: any[]; open: boolean; loading: boolean };

@Component({
  selector: 'app-question',
  standalone: true,
  imports: [
    ...sharedImports,
    MatPaginator,
    MatDialogModule,
    LoadingScreenComponent
  ],
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.css']
})
export class QuestionComponent implements OnInit, OnDestroy {
  @Input() subjectId!: number;
  @Input() departmentId!: number;

  @Input() labelFilter: 'ALL' | 'PRACTICE' | 'EXAM' = 'ALL';
  @Input() requireHeadForAnswers = false;

  // Overlay loading (thống nhất)
  isLoading = false;

  clonesState: Partial<Record<number, CloneState>> = {};

  questions: any[] = [];

  // Filters
  searchText = '';
  filterDifficulty = '';
  filterChapter: number | null = null;
  filterQuestionType = '';
  filterCreatedBy = '';
  filterDateRange: { from: Date | null; to: Date | null } = { from: null, to: null };

  isAdminOrHead = false;

  // Pagination
  paginatedQuestions: any[] = [];
  pageSize = 5;
  pageSizeOptions = [5, 10, 15, 20];
  currentPage = 0;
  totalItems = 0;

  // Answers visibility
  showAnswers = false;

  // Selection
  selectedIds = new Set<number>();

  private eventsSub?: Subscription;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private questionService: QuestionService,
    private loginService: LoginService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private qevents: QuestionEventsService
  ) { }

  // ===== Helpers for template =====
  stateOf(id: number): CloneState {
    return this.clonesState[id] ?? { items: [], open: false, loading: false };
  }

  // ===== Lifecycle =====
  ngOnInit(): void {
    this.checkUserRole();
    this.loadQuestions();

    this.eventsSub = this.qevents.changed$.subscribe(e => {
      if (e.subjectId !== this.subjectId) return;
      this.applyEvent(e);
    });
  }

  ngOnDestroy(): void {
    this.eventsSub?.unsubscribe();
  }

  private checkUserRole(): void {
    const role = this.loginService.getUserRole();
    this.isAdminOrHead = role === 'ADMIN' || role === 'HEAD';
  }

  // ===== Load & normalize =====
  loadQuestions(): void {
    const labels = this.labelFilter !== 'ALL' ? [this.labelFilter] as ('PRACTICE' | 'EXAM')[] : undefined;

    this.questionService.getQuestionsBySubject(this.subjectId, labels).pipe(
      withLoading(v => this.isLoading = v)
    ).subscribe({
      next: (data) => {
        this.questions = (data || []).map((q: any) => ({
          ...q,
          chapter: q.chapter != null ? Number(q.chapter) : null,
          labels: Array.isArray(q.labels) ? q.labels : []
        }));
        this.updateDataSource();
      },
      error: (err) => {
        this.showError('Lỗi khi tải danh sách câu hỏi: ' + (err.error?.message || 'Không xác định'));
      }
    });
  }

  private normalize(q: any) {
    return { ...q, chapter: q?.chapter != null ? Number(q.chapter) : null };
  }

  // ===== Event-bus apply =====
  private matchesThisTab(q: any): boolean {
    return this.labelFilter === 'ALL' || (Array.isArray(q.labels) && q.labels.includes(this.labelFilter));
  }

  private applyEvent(e: QuestionEvent) {
    switch (e.action) {
      case 'delete': {
        const idx = this.questions.findIndex(x => x.id === e.id);
        if (idx !== -1) {
          this.questions.splice(idx, 1);
          this.updateDataSource();
        }
        for (const k of Object.keys(this.clonesState)) {
          const st = this.clonesState[+k];
          if (!st) continue;
          const i = st.items.findIndex(x => x.id === e.id);
          if (i !== -1) { st.items.splice(i, 1); }
        }
        return;
      }

      case 'create':
      case 'update': {
        const q = e.question;
        const idx = this.questions.findIndex(x => x.id === q.id);
        const match = this.matchesThisTab(q);

        if (match) {
          if (idx !== -1) this.questions[idx] = this.normalize(q);
          else this.questions.push(this.normalize(q));
        } else {
          if (idx !== -1) this.questions.splice(idx, 1);
        }

        const pid = q.parentId;
        if (pid && this.clonesState[pid]?.open) {
          const st = this.clonesState[pid]!;
          const j = st.items.findIndex(x => x.id === q.id);
          if (j !== -1) st.items[j] = this.normalize(q);
          else if (e.action === 'create') st.items.push(this.normalize(q));
        }

        this.updateDataSource();
        return;
      }
    }
  }

  // ===== Filters & paging =====
  applyFilters(): void {
    this.updateDataSource();
  }

  resetFilters(): void {
    this.searchText = '';
    this.filterDifficulty = '';
    this.filterChapter = null;
    this.filterQuestionType = '';
    this.filterCreatedBy = '';
    this.filterDateRange = { from: null, to: null };
    this.updateDataSource();
  }

  updateDataSource(): void {
    this.totalItems = this.filteredQuestions.length;
    this.currentPage = 0;
    this.updatePaginatedData();
    this.checkAuthorization();
  }

  updatePaginatedData(): void {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedQuestions = this.filteredQuestions.slice(startIndex, endIndex);
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedData();
  }

  private normalizeFromDate(d?: Date | null): Date | null {
    if (!d) return null;
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private normalizeToDate(d?: Date | null): Date | null {
    if (!d) return null;
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }

  checkAuthorization(): void {
    if (!this.requireHeadForAnswers) return;
    if (!this.isAdminOrHead && this.showAnswers) {
      Swal.fire({
        title: 'Yêu cầu cấp quyền',
        text: 'Bạn cần HEAD/ADMIN cấp quyền để hiển thị đáp án câu hỏi thi.',
        icon: 'warning',
        confirmButtonText: 'Đã hiểu'
      }).then(() => this.showAnswers = false);
    }
  }

  // ===== CRUD (mở dialog) =====
  openCreateQuestionDialog(): void {
    const ref = this.dialog.open(QuestionEditDialogComponent, {
      width: '720px',
      maxHeight: '90vh',
      data: { subjectId: this.subjectId, mode: 'create' },
      autoFocus: false
    });

    ref.afterClosed().subscribe((q) => {
      if (!q) return;

      const stillMatch =
        this.labelFilter === 'ALL' ||
        (Array.isArray(q.labels) && q.labels.includes(this.labelFilter));

      if (stillMatch) {
        this.questions.push(this.normalize(q));
        this.updateDataSource();
      } else {
        this.updateDataSource();
        this.showSuccess('Đã tạo câu hỏi và chuyển sang tab khác theo nhãn.');
      }
    });
  }

  openEditQuestionDialog(question: any): void {
    const ref = this.dialog.open(QuestionEditDialogComponent, {
      width: '720px',
      maxHeight: '90vh',
      data: { subjectId: this.subjectId, mode: 'edit', question },
      autoFocus: false
    });

    ref.afterClosed().subscribe((q) => {
      if (!q) return;

      const stillMatch =
        this.labelFilter === 'ALL' ||
        (Array.isArray(q.labels) && q.labels.includes(this.labelFilter));

      const idx = this.questions.findIndex(x => x.id === q.id);

      if (!stillMatch) {
        if (idx !== -1) this.questions.splice(idx, 1);
        this.updateDataSource();
        this.showSuccess('Câu hỏi đã được cập nhật và chuyển sang tab khác theo nhãn.');
        return;
      }

      if (idx !== -1) this.questions[idx] = this.normalize(q);
      this.updateDataSource();
      this.showSuccess('Cập nhật câu hỏi thành công');
    });
  }

  deleteQuestion(questionId: number): void {
    Swal.fire({
      title: 'Xác nhận xóa',
      text: 'Bạn có chắc chắn muốn xóa câu hỏi này?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.questionService.deleteQuestion(this.subjectId, questionId).pipe(
        withLoading(v => this.isLoading = v)
      ).subscribe({
        next: () => {
          this.questions = this.questions.filter(q => q.id !== questionId);
          this.updateDataSource();
          this.qevents.emit({ subjectId: this.subjectId, action: 'delete', id: questionId });
          this.showSuccess('Xóa câu hỏi thành công');
        },
        error: (err) => this.showError('Lỗi khi xóa câu hỏi: ' + (err.error?.message || 'Không xác định'))
      });
    });
  }

  // ===== Derived list with filters + sort =====
  get filteredQuestions(): any[] {
    let filtered = [...this.questions];

    if (this.labelFilter !== 'ALL') {
      const lab = this.labelFilter;
      filtered = filtered.filter(q => (q.labels || []).includes(lab));
    }

    if (this.searchText) {
      const term = this.searchText.toLowerCase();
      filtered = filtered.filter(q =>
        (q.content || '').toLowerCase().includes(term) ||
        (q.questionType || '').toLowerCase().includes(term)
      );
    }

    if (this.filterDifficulty) {
      filtered = filtered.filter(q => q.difficulty === this.filterDifficulty);
    }

    if (this.filterChapter !== null) {
      const target = Number(this.filterChapter);
      filtered = filtered.filter(q => Number(q.chapter) === target);
    }

    if (this.filterQuestionType) {
      filtered = filtered.filter(q => q.questionType === this.filterQuestionType);
    }

    if (this.filterCreatedBy) {
      const term = this.filterCreatedBy.toLowerCase();
      filtered = filtered.filter(q =>
        (q.createdBy?.username || '').toLowerCase().includes(term) ||
        (q.createdBy?.fullName || '').toLowerCase().includes(term)
      );
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

  // ===== Selection helpers =====
  get selectedCount(): number { return this.selectedIds.size; }
  isSelected(id: number): boolean { return this.selectedIds.has(id); }

  toggleSelection(id: number, checked: boolean) {
    if (checked) this.selectedIds.add(id); else this.selectedIds.delete(id);
  }

  toggleSelectAllOnPage(checked: boolean) {
    for (const q of this.paginatedQuestions) {
      if (checked) this.selectedIds.add(q.id); else this.selectedIds.delete(q.id);
    }
  }

  clearSelection() { this.selectedIds.clear(); }

  trackById(index: number, q: any) { return q?.id; }

  areAllOnPageSelected(): boolean {
    const page = this.paginatedQuestions || [];
    return page.length > 0 && page.every(q => this.selectedIds.has(q.id));
  }

  onSelectAllChange(evt: Event): void {
    const checked = (evt.target as HTMLInputElement).checked;
    this.toggleSelectAllOnPage(checked);
  }

  onItemSelectChange(evt: Event, id: number): void {
    const checked = (evt.target as HTMLInputElement).checked;
    this.toggleSelection(id, checked);
  }

  // ===== Export selected =====
  exportSelected(): void {
    if (this.selectedIds.size === 0) {
      this.showError('Bạn chưa chọn câu hỏi nào để export.');
      return;
    }

    const ref = this.dialog.open(ExportQuestionsDialogComponent, {
      width: '720px',
      maxHeight: '90vh',
      data: { selectedCount: this.selectedIds.size },
      autoFocus: false
    });

    ref.afterClosed().subscribe((opts: ExportOptions | undefined) => {
      if (!opts) return;

      const ids = Array.from(this.selectedIds);

      this.questionService.exportQuestions(this.subjectId, ids, opts).pipe(
        withLoading(v => this.isLoading = v)
      ).subscribe({
        next: (resp) => {
          const blob = resp.body!;
          const cd = resp.headers.get('content-disposition') || '';
          const suggested = this.tryParseFileName(cd) || this.fallbackFileName(opts);

          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = suggested;
          a.click();
          URL.revokeObjectURL(url);

          this.showSuccess('Export thành công.');
        },
        error: err => this.showError('Export thất bại: ' + (err.error?.message || 'Không xác định'))
      });
    });
  }

  private tryParseFileName(cd: string): string | null {
    // content-disposition: attachment; filename="name.ext"
    const m = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(cd);
    return m ? decodeURIComponent(m[1].replace(/"/g, '')) : null;
  }

  private fallbackFileName(opts: ExportOptions): string {
    const ext = opts.format === 'docx' ? 'docx' : 'pdf';
    const fallback = opts.variant === 'exam'
      ? 'exam'
      : `nhcht_${(opts.form ?? 'TU_LUAN').toLowerCase()}_${this.subjectId}`;
    const base = (opts.fileName?.trim()) ? opts.fileName.trim() : fallback;
    const safe = base.replace(/[\\/:*?"<>|]+/g, '_');
    return safe.toLowerCase().endsWith(`.${ext}`) ? safe : `${safe}.${ext}`;
  }

  // ===== Delete selected =====
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

      from(ids).pipe(
        withLoading(v => this.isLoading = v),
        concatMap(id =>
          this.questionService.deleteQuestion(this.subjectId, id).pipe(
            catchError(() => of(null))
          )
        ),
        toArray()
      ).subscribe({
        next: (arr) => {
          const okIds = ids.filter((_, i) => arr[i] !== null);
          const fail = ids.length - okIds.length;

          this.questions = this.questions.filter(q => !okIds.includes(q.id));
          this.clearSelection();
          this.updateDataSource();
          this.showSuccess(`Đã xóa ${okIds.length} câu hỏi. Lỗi ${fail}.`);
        },
        error: () => {
          // hiếm khi vào đây do đã catch từng item
          this.showError('Có lỗi khi xoá các câu hỏi đã chọn.');
        }
      });
    });
  }

  // ===== Import (preview) =====
  openImportDryRun(): void {
    Swal.fire({
      title: 'Tải câu hỏi lên',
      html: `
      <input type="file" id="impFile" class="swal2-file" accept=".docx,.pdf">
      <div class="form-check mt-2">
        <input id="impSaveCopy" class="form-check-input" type="checkbox">
        <label for="impSaveCopy" class="form-check-label">Lưu vào kho chung</label>
      </div>
      <div class="text-muted small mt-2">Hỗ trợ .docx / .pdf</div>
    `,
      showCancelButton: true,
      confirmButtonText: 'Bản xem trước',
      preConfirm: () => {
        const f = (document.getElementById('impFile') as HTMLInputElement).files?.[0];
        const saveCopy = (document.getElementById('impSaveCopy') as HTMLInputElement).checked;
        if (!f) { Swal.showValidationMessage('Hãy chọn tệp'); return false; }
        return { file: f, saveCopy };
      }
    }).then(res => {
      if (!res.isConfirmed) return;

      const { file, saveCopy } = res.value as { file: File; saveCopy: boolean };
      const labels: ('PRACTICE' | 'EXAM')[] =
        this.labelFilter === 'EXAM' ? ['EXAM'] : ['PRACTICE'];

      this.questionService.importPreview(this.subjectId, file, saveCopy, labels).pipe(
        withLoading(v => this.isLoading = v)
      ).subscribe({
        next: (preview: any) => {
          const ref = this.dialog.open(ImportPreviewDialogComponent, {
            width: '1100px',
            maxHeight: '90vh',
            data: { subjectId: this.subjectId, preview, saveCopy },
            autoFocus: false
          });
          ref.afterClosed().subscribe((r) => {
            if (r?.committed) {
              this.showSuccess(`Đã tải câu hỏi xong: ${r.result?.success}/${r.result?.total}`);
              this.loadQuestions();
            }
          });
        },
        error: err => this.showError('Bản xem trước lỗi: ' + (err.error?.message || 'Không xác định'))
      });
    });
  }

  // ===== Clone flow =====
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
        if (!Number.isFinite(count) || count < 1) {
          Swal.showValidationMessage('Số lượng phải ≥ 1');
          return false;
        }
        return { count, copyImages };
      }
    }).then(res => {
      if (!res.isConfirmed) return;
      const { count, copyImages } = res.value as { count: number; copyImages: boolean };

      const req = { count, copyImages };

      this.questionService.cloneQuestion(this.subjectId, q.id, req).pipe(
        withLoading(v => this.isLoading = v)
      ).subscribe({
        next: async (clones) => {
          const editable = (clones || []).map((c: any) => ({
            ...c,
            answer: c.questionType === 'MULTIPLE_CHOICE' ? '' : c.answer,
            answerText: c.questionType === 'ESSAY' ? '' : c.answerText
          }));

          const { CloneQuickEditDialogComponent } =
            await import('../clone-quick-edit-dialog/clone-quick-edit-dialog.component');

          this.dialog
            .open(CloneQuickEditDialogComponent, {
              width: '1000px',
              maxHeight: '90vh',
              data: { subjectId: this.subjectId, clones: editable },
              autoFocus: false
            })
            .afterClosed()
            .subscribe((updatedList?: any[]) => {
              if (!updatedList) return;

              const st = this.clonesState[q.id];
              if (st?.open) {
                st.loading = true;
                this.questionService.getClones(this.subjectId, q.id).subscribe({
                  next: list => { st.items = (list || []).map(x => this.normalize(x)); st.loading = false; },
                  error: () => { st.loading = false; }
                });
              }

              this.showSuccess(`Đã lưu ${updatedList.length} bản sao.`);
            });
        },
        error: (err) => {
          this.showError(err?.error?.message || 'Tạo bản sao thất bại');
        }
      });
    });
  }

  toggleClones(q: any) {
    const st = this.clonesState[q.id] ?? (this.clonesState[q.id] = { items: [], open: false, loading: false });
    if (!st.open) {
      st.open = true;
      if (!st.items.length) {
        st.loading = true; // dùng loading cục bộ cho khu clones (không bật overlay toàn trang)
        this.questionService.getClones(this.subjectId, q.id).subscribe({
          next: list => { st.items = (list || []).map(x => this.normalize(x)); st.loading = false; },
          error: () => { st.loading = false; }
        });
      }
    } else {
      st.open = false;
    }
  }

  openEditCloneDialog(clone: any) {
    const ref = this.dialog.open(QuestionEditDialogComponent, {
      width: '720px',
      maxHeight: '90vh',
      data: { subjectId: this.subjectId, mode: 'edit', question: clone },
      autoFocus: false
    });

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
    Swal.fire({
      title: `Xóa bản sao #${clone.parentId}.${clone.cloneIndex}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy'
    }).then(res => {
      if (!res.isConfirmed) return;
      this.questionService.deleteQuestion(this.subjectId, clone.id).pipe(
        withLoading(v => this.isLoading = v)
      ).subscribe({
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

  // ===== UI helpers =====
  showSuccess(message: string): void {
    this.snackBar.open(message, 'Đóng', { duration: 3000, panelClass: ['success-snackbar'] });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Đóng', { duration: 3000, panelClass: ['error-snackbar'] });
  }
}
