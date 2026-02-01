import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, Subject, takeUntil, combineLatest, finalize, firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';

import { FileArchive } from '../../../models/fileArchive';
import { FileArchiveService } from '../../../services/file-archive.service';
import { PageResult } from '../../../models/pageResult';
import { ArchiveQuery } from '../../../models/ArchiveQuery';
import { sharedImports } from '../../../shared/shared-imports';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { VN_DATE_FORMATS } from '../../../models/dateFormats';
import { LoginService } from '../../../services/login.service';
import { ReviewReminderService } from '../../../services/review-reminder.service';
import { LoadingScreenComponent } from '../../loading-screen/loading-screen.component';
import { withLoading } from '../../../shared/with-loading';
import { MatDialog } from '@angular/material/dialog';
import { RejectDialogComponent, RejectDialogResult } from '../reject-dialog/reject-dialog.component';
// ❌ removed: NotificationService
import { ExamTaskService } from '../../../services/exam-task.service';
import { ReleaseAtDialogComponent, ReleaseAtDialogResult } from '../release-at-dialog/release-at-dialog.component';
import { MatMenuModule, MatMenuTrigger } from "@angular/material/menu";
import { UploadAnswerDialogComponent, UploadAnswerDialogResult } from '../upload-answer-dialog/upload-answer-dialog.component';

type OuterTab = 'ALL' | 'IMPORTS' | 'EXPORTS';
type Kind = 'IMPORT' | 'EXPORT' | 'SUBMISSION' | null;
type Variant = 'EXAM' | 'PRACTICE' | 'ANSWER' | null;
type ExVariantTab = 'PRACTICE' | 'EXAM' | 'ANSWER';

@Component({
  selector: 'app-archive-file',
  standalone: true,
  imports: [
    ...sharedImports,
    LoadingScreenComponent,
    MatMenuModule,
    MatMenuTrigger
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' },
    { provide: MAT_DATE_FORMATS, useValue: VN_DATE_FORMATS }
  ],
  templateUrl: './archive-file.component.html',
  styleUrls: ['./archive-file.component.css']
})
export class ArchiveFileComponent implements OnInit, OnDestroy {
  subjectId: number | null = null;
  linkedTaskIdFilter: number | null = null;
  // constraints từ route
  forceKind: Kind = null;
  forceVariant: Variant = null;
  moderationMode = false;
  reviewStatusFilter: 'PENDING' | 'APPROVED' | 'REJECTED' | null = null;
  viewMode: 'me' | 'subject' = 'me';

  // tabs
  showOuterTabs = true;
  outerTab: OuterTab = 'ALL';
  exportTab: ExVariantTab = 'EXAM';

  private get currentVariant(): Variant {
    return (this.finalKind === 'EXPORT' && !this.moderationMode && !this.reviewStatusFilter)
      ? (this.forceVariant ?? this.exportTab)
      : null;
  }

  get finalKind(): Kind {
    if (this.forceKind) return this.forceKind;
    if (this.outerTab === 'IMPORTS') return 'IMPORT';
    if (this.outerTab === 'EXPORTS') return 'EXPORT';
    return null;
  }

  // table
  displayedColumns: string[] = [];
  rows: FileArchive[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;

  isLoading = false;
  downloading = new Set<number>();
  headStatus = new Map<number, boolean | undefined>();

  // filters
  search = new FormControl<string>('', { nonNullable: true });
  filterSubjectText = new FormControl<string>('', { nonNullable: true });
  filterUploaderText = new FormControl<string>('', { nonNullable: true });
  filterFrom = new FormControl<Date | null>(null);
  filterTo = new FormControl<Date | null>(null);
  statusSel = new FormControl<string>(''); // '', 'PENDING', 'APPROVED', 'REJECTED'
  showFilters = false;

  private ymd(d?: Date | null) {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private destroy$ = new Subject<void>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private api: FileArchiveService,
    private route: ActivatedRoute,
    private login: LoginService,
    private rr: ReviewReminderService,
    private dialog: MatDialog,
    private router: Router
  ) { }

  ngOnInit(): void {
    combineLatest([this.route.data, this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([data, pm, qm]) => {
        this.forceKind = (data['kind'] ?? null) as Kind;
        this.forceVariant = (data['variant'] ?? null) as Variant;
        this.moderationMode = !!data['moderation'];
        this.reviewStatusFilter = (data['reviewStatus'] ?? null) as any;

        this.showOuterTabs = (this.forceKind == null) && !this.moderationMode;
        this.exportTab = (this.forceVariant ?? 'EXAM') as ExVariantTab;

        if (this.reviewStatusFilter) {
          this.statusSel.setValue(this.reviewStatusFilter);
        } else {
          this.statusSel.setValue('');
        }

        const paramId = pm.get('subjectId');
        const queryId = qm.get('subjectId');
        const n = Number(paramId ?? queryId);
        this.subjectId = Number.isFinite(n) && n > 0 ? n : null;

        const linked = Number(qm.get('linkedTaskId') ?? '');
        this.linkedTaskIdFilter = Number.isFinite(linked) && linked > 0 ? linked : null;

        this.pageIndex = 0;
        this.buildColumns();
        this.load();
      });

    this.search.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => { this.pageIndex = 0; this.load(); });

    this.statusSel.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => { this.pageIndex = 0; this.load(); });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  get isTeacherOnly(): boolean {
    return this.login.getUserRole() === 'TEACHER';
  }

  onPage(e: PageEvent) {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.load();
  }

  toggleFilters() { this.showFilters = !this.showFilters; }
  applyFilters() { this.pageIndex = 0; this.load(); }
  clearClientFilters() {
    this.filterSubjectText.setValue('');
    this.filterUploaderText.setValue('');
    this.filterFrom.setValue(null);
    this.filterTo.setValue(null);
    this.pageIndex = 0;
    this.load();
  }

  private buildColumns() {
    const isUserPending = this.reviewStatusFilter === 'PENDING' && !this.moderationMode;

    const cols: string[] = ['filename', 'subject'];
    if (!isUserPending) cols.push('uploader');
    cols.push('size');

    if (!this.finalKind) cols.push('kind');

    const showVariantCol = (this.finalKind !== 'IMPORT') && (this.currentVariant == null);
    if (showVariantCol) cols.push('variant');

    if (this.moderationMode || this.reviewStatusFilter || (this.statusSel.value || '').length) {
      cols.push('status');
    }

    cols.push('createdAt', 'actions');
    this.displayedColumns = cols;
  }

  get viewRows() { return this.rows; }

  private lazyHead(id: number) {
    if (this.headStatus.get(id) !== undefined) return;
    setTimeout(() => {
      this.api.head(id).subscribe({
        next: () => this.headStatus.set(id, true),
        error: () => this.headStatus.set(id, false)
      });
    }, 200);
  }

  view(r: FileArchive) {
    const win = window.open('about:blank', '_blank');
    this.api.getViewUrl(r.id).subscribe({
      next: ({ url }) => {
        if (!url) { win?.close(); return; }
        const finalUrl = this.needsOfficeViewer(r) ? this.wrapOfficeViewer(url) : url;
        try { win?.location.replace(finalUrl); }
        catch { win?.close(); window.open(finalUrl, '_blank'); }
      },
      error: err => {
        win?.close();
        const msg = (err?.status === 403 && err?.error?.message)
          ? err.error.message
          : 'Không lấy được link xem file.';
        Swal.fire('Lỗi', msg, 'error');
        console.error(err);
      }
    });
  }

  download(r: FileArchive) {
    if (this.downloading.has(r.id)) return;
    this.downloading.add(r.id);
    this.api.getDownloadUrl(r.id)
      .pipe(finalize(() => this.downloading.delete(r.id)), withLoading(v => this.isLoading = v))
      .subscribe({
        next: ({ url }) => {
          const a = document.createElement('a');
          a.href = url; a.target = '_blank'; a.rel = 'noopener';
          document.body.appendChild(a); a.click(); a.remove();
        },
        error: err => {
          const msg = (err?.status === 403 && err?.error?.message)
            ? err.error.message
            : 'Không lấy được link tải file.';
          Swal.fire('Lỗi', msg, 'error');
          console.error(err);
        }
      });
  }

  private meId(): number | null {
    const u = this.login.getUser();
    return (u && typeof u.id === 'number') ? u.id : null;
  }
  private isAdmin(): boolean { return this.login.getUserRole() === 'ADMIN' || this.login.getUserRole() === 'HEAD'; }
  private isTeacher(): boolean { return this.login.getUserRole() === 'TEACHER'; }

  private canDelete(r: FileArchive): boolean {
    if (this.isAdmin()) return true;
    if (!this.isTeacher()) return false;

    const mine = r.userId != null && r.userId === this.meId();
    if (!mine) return false;

    if (r.kind === 'EXPORT') {
      const st = String(r.reviewStatus || '').toUpperCase();
      return st !== 'APPROVED';
    }
    return true;
  }

  async confirmDelete(r: FileArchive) {
    if (!this.canDelete(r)) {
      const isExportApproved = r.kind === 'EXPORT' && String(r.reviewStatus || '').toUpperCase() === 'APPROVED';
      const msg = this.isAdmin() ? 'Bạn là ADMIN (lỗi bất ngờ).' :
        this.isTeacher()
          ? (r.userId !== this.meId()
            ? 'Bạn chỉ có thể xoá các file do chính bạn tạo.'
            : (isExportApproved
              ? 'Không thể xoá đề đã APPROVED. Chỉ có thể xoá PENDING/REJECTED.'
              : 'Bạn không có quyền xoá mục này.'))
          : 'Bạn không có quyền xoá.';
      await Swal.fire('Không thể xoá', msg, 'info');
      return;
    }

    const res = await Swal.fire({
      icon: 'warning',
      title: 'Xoá file?',
      text: `Bạn chắc muốn xoá "${r.filename}"?`,
      showCancelButton: true,
      confirmButtonText: 'Xoá',
      cancelButtonText: 'Huỷ'
    });
    if (!res.isConfirmed) return;

    this.api.delete(r.id).pipe(
      withLoading(v => this.isLoading = v)
    ).subscribe({
      next: () => {
        this.api.invalidate(k => k.includes(`"subjectId":${this.subjectId ?? null}`));
        Swal.fire({ icon: 'success', title: 'Đã xoá', timer: 1200, showConfirmButton: false });
        this.rows = this.rows.filter(x => x.id !== r.id);
        this.total = Math.max(0, this.total - 1);
      },
      error: err => { Swal.fire('Lỗi', 'Không xoá được file.', 'error'); console.error(err); }
    });
  }

  // --- Hàm chính: Duyệt file ---
  async approveFile(r: FileArchive) {
    // 1. Xác nhận duyệt file (Đơn giản, không hỏi sinh đáp án vội)
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: 'Xác nhận duyệt',
      text: `Bạn có chắc chắn muốn duyệt file "${r.filename}"?`,
      showCancelButton: true,
      confirmButtonText: 'Duyệt',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#198754'
    });

    if (!isConfirmed) return;

    // 2. Gọi API Approve
    this.isLoading = true;
    const shouldApproveTask =
      !!r.linkedTaskId &&
      (this.linkedTaskIdFilter ? r.linkedTaskId === this.linkedTaskIdFilter : true) &&
      ['SUBMITTED', 'RETURNED'].includes((r.linkedTaskStatus || '').toUpperCase());

    this.api.approve(r.id, { approveTask: shouldApproveTask })
      .subscribe({
        next: (res) => {
          // Cập nhật UI
          this.api.invalidate(k => k.includes(`"subjectId":${this.subjectId ?? null}`));
          if ((this.reviewStatusFilter || '').toUpperCase() === 'PENDING') {
            this.rows = this.rows.filter(x => x.id !== r.id);
            this.total = Math.max(0, this.total - 1);
          } else {
            (r as any).reviewStatus = 'APPROVED';
          }

          this.isLoading = false;

          // 3. [NEW FLOW] Sau khi duyệt xong -> Hỏi sinh đáp án
          this.askToRegenerateAnswer(r);
        },
        error: (err) => {
          this.isLoading = false;
          Swal.fire('Lỗi', 'Duyệt thất bại.', 'error');
          console.error(err);
        }
      });
  }

  // --- Hàm phụ: Hỏi sinh đáp án ---
  async askToRegenerateAnswer(r: FileArchive) {
    const { isConfirmed, value } = await Swal.fire({
      icon: 'success',
      title: 'File đã được duyệt!',
      html: `
        <div class="text-start" style="margin: 4px;">
          <p class="mb-3">Bạn có muốn <b>sinh file đáp án</b> cho file vừa duyệt không?</p>

          <div class="form-check p-2 bg-light rounded border d-flex align-items-center">
             <input class="form-check-input ms-1" type="checkbox" id="swal-merge-file">
             <label class="form-check-label ms-2 user-select-none" for="swal-merge-file">
               Gộp tất cả mã đề vào 1 file Word
             </label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-magic"></i> Sinh đáp án',
      cancelButtonText: 'Để sau',
      confirmButtonColor: '#0d6efd',
      preConfirm: () => {
        return {
          merge: (document.getElementById('swal-merge-file') as HTMLInputElement).checked
        };
      }
    });

    if (isConfirmed && value) {
      // Gọi hàm sinh đáp án
      this.performRegenerate(r.id, value.merge, r.subjectId);
    }
  }

  // --- Hàm phụ: Thực hiện sinh đáp án ---
  private performRegenerate(archiveId: number, merge: boolean, subjectId?: number | null) {
    this.isLoading = true;
    this.api.regenerateAnswer(archiveId, null, merge)
      .subscribe({
        next: (resp) => {
          this.isLoading = false;
          if (resp.success) {
            // 4. Thông báo thành công & Dẫn link
            Swal.fire({
              icon: 'success',
              title: 'Sinh đáp án thành công',
              html: `
                 <div class="text-start">
                   <div>File: <strong>${resp.filename}</strong></div>
                   <div class="text-muted small mt-2">Đã lưu vào mục File đáp án.</div>
                 </div>
               `,
              showCancelButton: true,
              confirmButtonText: 'Xem file đáp án',
              cancelButtonText: 'Đóng'
            }).then((res) => {
              if (res.isConfirmed) {
                this.goToAnswerTab(subjectId);
              }
            });

            // Refresh list (nếu đang ở tab All)
            this.load();
          } else {
            Swal.fire('Cảnh báo', 'Lỗi sinh đáp án: ' + resp.error, 'warning');
          }
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err?.error?.message || 'Lỗi hệ thống';
          Swal.fire('Lỗi', 'Sinh đáp án thất bại: ' + msg, 'error');
        }
      });
  }

  private computeDeadlineFromPreset(
    preset: 'none' | '4h' | '8h' | '24h' | '3d' | '7d' | 'custom',
    n?: number,
    unit?: 'h' | 'd'
  ): Date | null {
    const base = Date.now();
    const add = (ms: number) => new Date(base + ms);

    switch (preset) {
      case 'none': return null;
      case '4h': return add(4 * 60 * 60 * 1000);
      case '8h': return add(8 * 60 * 60 * 1000);
      case '24h': return add(24 * 60 * 60 * 1000);
      case '3d': return add(3 * 24 * 60 * 60 * 1000);
      case '7d': return add(7 * 24 * 60 * 60 * 1000);
      case 'custom':
        const qty = Number.isFinite(n) && (n ?? 0) > 0 ? (n as number) : 0;
        if (!qty) return null;
        const ms = (unit === 'h' ? qty * 60 * 60 * 1000 : qty * 24 * 60 * 60 * 1000);
        return add(ms);
    }
    return null;
  }

  async rejectFile(r: FileArchive) {
    const ref = this.dialog.open(RejectDialogComponent, {
      width: '560px',
      data: {
        filename: r.filename,
        subjectName: r.subjectName,
        subjectId: r.subjectId,
        uploaderName: r.uploaderName
      },
      autoFocus: false,
      panelClass: 'ep-dialog'
    });

    const result = await firstValueFrom(ref.afterClosed()) as RejectDialogResult | undefined;
    if (!result) return;

    const { reason, deadline } = result;

    const rejectTask =
      !!r.linkedTaskId &&
      (this.linkedTaskIdFilter ? r.linkedTaskId === this.linkedTaskIdFilter : true) &&
      (r.linkedTaskStatus || '').toUpperCase() === 'SUBMITTED';

    this.api.reject(r.id, reason, deadline, undefined, { rejectTask }).pipe(
      withLoading(v => this.isLoading = v)
    ).subscribe({
      next: () => {
        this.api.invalidate(k => k.includes(`"subjectId":${this.subjectId ?? null}`));
        if ((this.reviewStatusFilter || '').toUpperCase() === 'PENDING') {
          this.rows = this.rows.filter(x => x.id !== r.id);
          this.total = Math.max(0, this.total - 1);
        } else {
          (r as any).reviewStatus = 'REJECTED';
          (r as any).reviewNote = reason;
          (r as any).reviewDeadline = deadline as any;
        }
        // ❌ removed old: this.notif.invalidateUnread();
        Swal.fire({
          icon: 'success',
          title: rejectTask ? 'Đã từ chối & yêu cầu nộp lại nhiệm vụ' : 'Đã từ chối',
          timer: 1300,
          showConfirmButton: false
        });
      },
      error: err => { Swal.fire('Lỗi', 'Từ chối thất bại.', 'error'); console.error(err); }
    });
  }

  humanSize(n: number) {
    if (n < 1024) return `${n} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let i = -1; do { n /= 1024; i++; } while (n >= 1024 && i < units.length - 1);
    return `${n.toFixed(1)} ${units[i]}`;
  }

  badgeClass(kind: string) {
    switch (kind) {
      case 'EXPORT': return 'badge text-bg-warning';
      case 'IMPORT': return 'badge text-bg-success';
      case 'SUBMISSION': return 'badge text-bg-primary';
      default: return 'badge text-bg-secondary';
    }
  }

  variantBadge(r: FileArchive) {
    const v = (r.variant || '').toUpperCase();
    return v === 'EXAM' ? 'badge text-bg-primary'
      : v === 'PRACTICE' ? 'badge text-bg-info'
        : v === 'ANSWER' ? 'badge text-bg-warning'
          : 'badge text-bg-secondary';
  }

  statusBadge(s?: string) {
    const v = (s || '').toUpperCase();
    return v === 'APPROVED' ? 'badge text-bg-success'
      : v === 'REJECTED' ? 'badge text-bg-danger'
        : 'badge text-bg-secondary';
  }

  rejectTooltip(r: FileArchive): string {
    if ((r.reviewStatus || '').toUpperCase() !== 'REJECTED') return '';
    const note = r.reviewNote ? `Lý do: ${r.reviewNote}` : 'Lý do: (không có)';
    const dl = r.reviewDeadline ? `\nHạn: ${new Date(r.reviewDeadline as any).toLocaleDateString()}` : '';
    return note + dl;
  }

  iconClass(r: FileArchive): string {
    const name = (r.filename || '').toLowerCase();
    const mime = (r.mimeType || '').toLowerCase();
    if (name.endsWith('.zip') || mime.includes('zip')) return 'bi bi-file-zip fs-3 file-icon';
    if (mime.includes('pdf') || name.endsWith('.pdf')) return 'bi bi-filetype-pdf fs-3 file-icon';
    if (name.endsWith('.doc') || name.endsWith('.docx') || mime.includes('word')) return 'bi bi-filetype-docx fs-3 file-icon';
    return 'bi bi-file-earmark fs-3 file-icon';
  }

  private needsOfficeViewer(r: FileArchive): boolean {
    const n = (r.filename || '').toLowerCase();
    const m = (r.mimeType || '').toLowerCase();
    return n.endsWith('.doc') || n.endsWith('.docx') ||
      n.endsWith('.ppt') || n.endsWith('.pptx') ||
      n.endsWith('.xls') || n.endsWith('.xlsx') ||
      m.includes('word') || m.includes('powerpoint') || m.includes('excel');
  }
  private wrapOfficeViewer(url: string): string {
    return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
  }

  private buildListArgs(): {
    subjectId?: number; page: number; size: number;
    opts: ArchiveQuery & { reviewStatus?: string, linkedTaskId?: number, view?: 'me' | 'subject' }
  } {
    const opts: ArchiveQuery & { reviewStatus?: string, linkedTaskId?: number } = {};

    const sel = (this.statusSel.value || '').toUpperCase();
    const routeFilter = (this.reviewStatusFilter || '').toUpperCase();
    const isPendingView = sel === 'PENDING' || routeFilter === 'PENDING';

    if (this.linkedTaskIdFilter) {
      opts.kind = 'SUBMISSION' as any;
      opts.linkedTaskId = this.linkedTaskIdFilter;
    } else {
      if (!isPendingView) {
        if (this.finalKind) opts.kind = this.finalKind;
      }
      if (isPendingView) {
        opts.reviewStatus = 'PENDING';
      } else if (sel === 'APPROVED' || sel === 'REJECTED') {
        opts.reviewStatus = sel;
      } else if (this.reviewStatusFilter) {
        opts.reviewStatus = routeFilter as any;
      } else if (!this.moderationMode) {
        opts.reviewStatus = 'APPROVED';
      }

      const variant = (opts.kind === 'EXPORT' || (!opts.kind && this.finalKind === 'EXPORT'))
        && !this.moderationMode && !this.reviewStatusFilter
        ? (this.forceVariant ?? this.exportTab) : null;
      if (variant) opts.variant = variant as any;
    }
    if (this.isTeacherOnly) {
      opts.view = this.viewMode;
    }

    const q = this.search.value?.trim(); if (q) opts.q = q;
    const subj = this.filterSubjectText.value?.trim(); if (subj) opts.subject = subj;
    const upl = this.filterUploaderText.value?.trim(); if (upl) opts.uploader = upl;
    const from = this.ymd(this.filterFrom.value); if (from) opts.from = from;
    const to = this.ymd(this.filterTo.value); if (to) opts.to = to;

    return { subjectId: this.subjectId ?? undefined, page: this.pageIndex, size: this.pageSize, opts };
  }

  onViewModeChange() {
    this.pageIndex = 0; // Reset về trang 1
    this.load();
  }

  private load() {
    const args = this.buildListArgs();

    const hadCache = this.api.isCached(args);

    const stream$ = this.api.listCached(args);

    (hadCache ? stream$ : stream$.pipe(withLoading(v => this.isLoading = v)))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page: PageResult<FileArchive>) => {
          this.rows = page.content;
          this.total = page.totalElements;
          this.buildColumns();

          this.rows.forEach(r => {
            if (!this.headStatus.has(r.id)) this.headStatus.set(r.id, undefined);
            this.lazyHead(r.id);
          });
        },
        error: err => {
          Swal.fire('Lỗi', 'Không tải được danh sách file.', 'error');
          console.error(err);
        }
      });
  }

  get emptyMessage(): string {
    if (this.linkedTaskIdFilter && !this.isLoading) {
      return 'File đã bị xoá hoặc không còn tồn tại (HEAD đã xoá).';
    }
    return 'Không có file nào.';
  }

  private tabState = new Map<string, { pageIndex: number; pageSize: number }>();
  private tabKey() {
    return `${this.finalKind ?? 'ALL'}|${this.currentVariant ?? '-'}|${this.statusSel.value || '-'}`;
  }

  onOuterTabChange(idx: number) {
    this.tabState.set(this.tabKey(), { pageIndex: this.pageIndex, pageSize: this.pageSize });
    this.outerTab = idx === 0 ? 'ALL' : idx === 1 ? 'IMPORTS' : 'EXPORTS';
    if (this.outerTab === 'EXPORTS' && !this.forceVariant) this.exportTab = 'PRACTICE';

    const saved = this.tabState.get(this.tabKey());
    if (saved) { this.pageIndex = saved.pageIndex; this.pageSize = saved.pageSize; }
    else { this.pageIndex = 0; }

    this.buildColumns(); this.load();
  }

  onExportTabChange(idx: number) {
    this.tabState.set(this.tabKey(), { pageIndex: this.pageIndex, pageSize: this.pageSize });
    this.exportTab = idx === 0 ? 'EXAM' : 'PRACTICE';

    const saved = this.tabState.get(this.tabKey());
    if (saved) { this.pageIndex = saved.pageIndex; this.pageSize = saved.pageSize; }
    else { this.pageIndex = 0; }

    this.buildColumns(); this.load();
  }

  resetSnooze() {
    this.rr.reset({ clearForever: true });
    Swal.fire({ icon: 'success', title: 'Đã bật lại thông báo', timer: 1200, showConfirmButton: false });
    this.rr.checkOnEnterDashboard().catch(() => { });
  }

  get isPendingTab() {
    return (this.reviewStatusFilter || '').toUpperCase() === 'PENDING';
  }

  async openReleaseAt(r: FileArchive) {
    const ref = this.dialog.open(ReleaseAtDialogComponent, {
      width: '520px',
      data: { id: r.id, filename: r.filename },
      autoFocus: false,
      panelClass: 'ep-dialog'
    });

    const result = await firstValueFrom(ref.afterClosed()) as ReleaseAtDialogResult | undefined;
    if (!result) return;

    const { releaseAtIso } = result;
    this.api.setReleaseAt(r.id, releaseAtIso)
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: () => {
          this.api.invalidate(k => k.includes(`"subjectId":${this.subjectId ?? null}`));
          Swal.fire({ icon: 'success', title: 'Đã cập nhật lịch mở', timer: 1200, showConfirmButton: false });
          this.load();
        },
        error: err => { Swal.fire('Lỗi', 'Cập nhật lịch mở thất bại.', 'error'); console.error(err); }
      });
  }

  canScheduleAnswer(r: FileArchive) {
    return this.isAdmin() && (r.kind === 'EXPORT') && ((r.variant || '').toUpperCase() === 'ANSWER');
  }

  isAnswer(r: FileArchive) {
    return r.kind === 'EXPORT' && (r.variant || '').toUpperCase() === 'ANSWER';
  }

  locked(r: FileArchive) {
    if (!this.isAnswer(r)) return false;
    if (this.isAdmin()) return false;
    const iso = (r as any).releaseAt as string | null | undefined;
    if (!iso) return true;
    return Date.now() < new Date(iso).getTime();
  }
  get isAnswerTab(): boolean {
    return this.finalKind === 'EXPORT' &&
      this.currentVariant === 'ANSWER' &&
      !this.moderationMode &&
      !this.reviewStatusFilter;
  }

  isSubmissionRow(r: FileArchive): boolean {
    return r.kind === 'SUBMISSION';
  }

  canUploadAnswer(): boolean {
    return this.isAdmin() || this.isTeacher();
  }

  canRegenerateAnswer(r: FileArchive): boolean {
    return r.kind === 'SUBMISSION' &&
      (r.variant || '').toUpperCase() === 'EXAM' &&
      (r.reviewStatus || '').toUpperCase() === 'APPROVED';
  }

  async openUploadAnswerDialog() {
    const ref = this.dialog.open(UploadAnswerDialogComponent, {
      width: '600px',
      data: {},
      panelClass: 'ep-dialog'
    });

    const result = await firstValueFrom(ref.afterClosed()) as UploadAnswerDialogResult | undefined;
    if (!result?.file || !result?.subjectId) return;

    this.api.uploadAnswer(result.file, result.subjectId)
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: () => {
          this.api.invalidate();
          Swal.fire({
            icon: 'success',
            title: 'Upload thành công',
            text: 'File đáp án đã được lưu. Bạn có thể đặt lịch mở sau.',
            timer: 2000,
            showConfirmButton: false
          });
          this.load();
        },
        error: err => {
          const msg = err?.error?.message || 'Upload thất bại. Vui lòng thử lại.';
          Swal.fire('Lỗi', msg, 'error');
          console.error(err);
        }
      });
  }

  async regenerateAnswerFromSubmission(r: FileArchive) {
    const { isConfirmed, value } = await Swal.fire({
      icon: 'question',
      title: 'Sinh đáp án tự động',
      html: `
        <div class="text-start">
          <div class="mb-3">
            Sinh đáp án từ submission: <strong>${r.filename}</strong>
          </div>
          
          <div class="form-check p-2 bg-light rounded border d-flex align-items-center">
             <input class="form-check-input ms-1" type="checkbox" id="swal-merge-file">
             <label class="form-check-label ms-2 user-select-none" for="swal-merge-file">
               Gộp tất cả mã đề vào 1 file Word
             </label>
          </div>

          <div class="text-muted small mt-3">
            • Hệ thống sẽ đọc blueprint/ma trận từ file ZIP<br/>
            • Tạo file ZIP chứa DOCX đáp án tương ứng<br/>
            • File đáp án sẽ được lưu với trạng thái APPROVED
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-magic"></i> Sinh đáp án',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#0d6efd',
      preConfirm: () => {
        return {
          // Lấy giá trị checkbox
          merge: (document.getElementById('swal-merge-file') as HTMLInputElement).checked
        };
      }
    });

    if (!isConfirmed || !value) return;

    // Gọi API với tham số merge
    // regenerateAnswer(id, releaseAt, merge)
    this.api.regenerateAnswer(r.id, null, value.merge)
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: (resp) => {
          if (resp.success) {
            this.api.invalidate(k => k.includes(`"subjectId":${this.subjectId}`));
            
            Swal.fire({
              icon: 'success',
              title: 'Sinh đáp án thành công',
              html: `
                <div class="text-start">
                  <div>File: <strong>${resp.filename || 'N/A'}</strong></div>
                  <div class="text-muted small mt-2">
                    Bạn có thể đặt lịch mở đáp án ở tab "File đáp án"
                  </div>
                </div>
              `,
              showCancelButton: true,
              confirmButtonText: 'Xem file đáp án',
              cancelButtonText: 'Đóng'
            }).then((res) => {
               if (res.isConfirmed) {
                 this.goToAnswerTab(r.subjectId);
               }
            });

            this.load();
          } else {
            Swal.fire('Lỗi', resp.error || 'Sinh đáp án thất bại', 'error');
          }
        },
        error: err => {
          const msg = err?.error?.error || err?.error?.message || 'Sinh đáp án thất bại';
          Swal.fire('Lỗi', msg, 'error');
          console.error(err);
        }
      });
  }

  private async getSubjectName(subjectId: number): Promise<string> {
    try {
      const existing = this.rows.find(r => r.subjectId === subjectId);
      if (existing?.subjectName) return existing.subjectName;
      return `Môn học #${subjectId}`;
    } catch {
      return `Môn học #${subjectId}`;
    }
  }

  isAnswerRow(r: FileArchive): boolean {
    return r.kind === 'EXPORT' && (r.variant || '').toUpperCase() === 'ANSWER';
  }

  hasReleaseAt(r: FileArchive): boolean {
    try {
      const iso = (r as any).releaseAt as string | null | undefined;
      return !!iso;
    } catch {
      return false;
    }
  }

  private goToAnswerTab(subjectId?: number | null) {
    // TODO: đổi route này thành đúng path "File đáp án" trong app của bạn
    const commands = ['/head-dashboard/archive/answers'];

    const extras: any = {};
    if (subjectId) {
      extras.queryParams = { subjectId };
    }

    this.router.navigate(commands, extras);
  }
}
