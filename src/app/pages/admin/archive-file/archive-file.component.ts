// src/app/pages/admin/archive-file/archive-file.component.ts
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
import { NotificationService } from '../../../services/notification.service';
import { ExamTaskService } from '../../../services/exam-task.service';

type OuterTab = 'ALL' | 'IMPORTS' | 'EXPORTS';
type Kind = 'IMPORT' | 'EXPORT' | 'SUBMISSION' | null;
type Variant = 'EXAM' | 'PRACTICE' | null;
type ExVariantTab = 'PRACTICE' | 'EXAM';

@Component({
  selector: 'app-archive-file',
  standalone: true,
  imports: [
    ...sharedImports,
    LoadingScreenComponent
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

  // tabs
  showOuterTabs = true;
  outerTab: OuterTab = 'ALL';
  exportTab: ExVariantTab = 'PRACTICE';

  private get currentVariant(): Variant {
    // Chỉ dùng tab con khi KHÔNG ở moderation & KHÔNG ép reviewStatus (Pending/History)
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
  // ===== đổi kiểu FormControl cho from/to:
  filterFrom = new FormControl<Date | null>(null);
  filterTo = new FormControl<Date | null>(null);
  // NEW: trạng thái (để thống nhất bộ lọc và sửa Pending mặc định)
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
    private notif: NotificationService,
    private examTaskApi: ExamTaskService
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
        this.exportTab = (this.forceVariant ?? 'PRACTICE') as ExVariantTab;

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

    // Đổi trạng thái -> reload
    this.statusSel.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => { this.pageIndex = 0; this.load(); });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

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

    // Ẩn cột Kind nếu đã biết chắc (khi đã chọn kind nào đó)
    if (!this.finalKind) cols.push('kind');

    // Chỉ hiện cột Variant khi là EXPORT & không khóa theo tab variant
    const showVariantCol = (this.finalKind !== 'IMPORT') && (this.currentVariant == null);
    if (showVariantCol) cols.push('variant');

    // Cột Status khi ở moderation / có filter trạng thái / hoặc route ép
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

  // ===== Actions =====
  view(r: FileArchive) {
    const win = window.open('about:blank', '_blank');
    this.api.getViewUrl(r.id).subscribe({
      next: ({ url }) => {
        if (!url) { win?.close(); return; }
        const finalUrl = this.needsOfficeViewer(r) ? this.wrapOfficeViewer(url) : url;
        try { win?.location.replace(finalUrl); }
        catch { win?.close(); window.open(finalUrl, '_blank'); }
      },
      error: err => { win?.close(); Swal.fire('Lỗi', 'Không lấy được link xem file.', 'error'); console.error(err); }
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
        error: err => { Swal.fire('Lỗi', 'Không lấy được link tải file.', 'error'); console.error(err); }
      });
  }

  private meId(): number | null {
    const u = this.login.getUser();
    return (u && typeof u.id === 'number') ? u.id : null;
  }
  private isAdmin(): boolean { return this.login.getUserRole() === 'ADMIN' || this.login.getUserRole() === 'HEAD'; }
  private isTeacher(): boolean { return this.login.getUserRole() === 'TEACHER'; }

  /** Rule:
   *  - ADMIN: xoá mọi file
   *  - TEACHER: chỉ xoá file mình tạo
   *      + EXPORT: không được xoá khi đã APPROVED (cho PENDING/REJECTED)
   *      + IMPORT: được xoá file của mình
   */
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
    // kiểm tra quyền trước
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


  // archive-file.component.ts
  async approveFile(r: FileArchive) {
    const ok = (await Swal.fire({
      icon: 'question',
      title: 'Duyệt file?',
      text: `Duyệt và chuyển file "${r.filename}" sang kho chính.`,
      showCancelButton: true,
      confirmButtonText: 'Duyệt'
    })).isConfirmed;
    if (!ok) return;

    // ✅ TỰ ĐỘNG duyệt nhiệm vụ luôn khi:
    // - Có linkedTaskId
    // - (tuỳ) đang vào từ context linkedTaskId (đảm bảo đúng task)
    // - Trạng thái nhiệm vụ phù hợp để duyệt (SUBMITTED/RETURNED)
    const shouldApproveTask =
      !!r.linkedTaskId &&
      (this.linkedTaskIdFilter ? r.linkedTaskId === this.linkedTaskIdFilter : true) &&
      ['SUBMITTED', 'RETURNED'].includes((r.linkedTaskStatus || '').toUpperCase());

    this.api.approve(r.id, { approveTask: shouldApproveTask })
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: (res) => {
          this.api.invalidate(k => k.includes(`"subjectId":${this.subjectId ?? null}`));
          if ((this.reviewStatusFilter || '').toUpperCase() === 'PENDING') {
            this.rows = this.rows.filter(x => x.id !== r.id);
            this.total = Math.max(0, this.total - 1);
          } else {
            (r as any).reviewStatus = 'APPROVED';
          }
          this.notif.invalidateUnread();

          // Thông báo gọn, KHÔNG hỏi thêm Swal lần 2
          if (shouldApproveTask && res.taskApproved) {
            Swal.fire({ icon: 'success', title: 'Đã duyệt file & nhiệm vụ', timer: 1300, showConfirmButton: false });
          } else if (shouldApproveTask && !res.taskApproved) {
            Swal.fire({ icon: 'info', title: 'Đã duyệt file (nhiệm vụ không ở trạng thái phù hợp)', timer: 1600, showConfirmButton: false });
          } else {
            Swal.fire({ icon: 'success', title: 'Đã duyệt file', timer: 1200, showConfirmButton: false });
          }
        },
        error: (err) => {
          Swal.fire('Lỗi', 'Duyệt thất bại.', 'error');
          console.error(err);
        }
      });
  }

  // === Helper: tính deadline từ preset/giá trị custom ===
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
      disableClose: true,
      panelClass: 'ep-dialog'
    });

    const result = await firstValueFrom(ref.afterClosed()) as RejectDialogResult | undefined;
    if (!result) return;

    const { reason, deadline } = result;

    // ✅ TỰ ĐỘNG “trả nhiệm vụ” khi có linkedTaskId và nhiệm vụ đang SUBMITTED
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
        this.notif.invalidateUnread();
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

  // ===== helpers =====
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

  // ===== Query & cache =====
  private buildListArgs(): {
    subjectId?: number; page: number; size: number;
    opts: ArchiveQuery & { reviewStatus?: string, linkedTaskId?: number }
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

    const q = this.search.value?.trim(); if (q) opts.q = q;
    const subj = this.filterSubjectText.value?.trim(); if (subj) opts.subject = subj;
    const upl = this.filterUploaderText.value?.trim(); if (upl) opts.uploader = upl;
    const from = this.ymd(this.filterFrom.value); if (from) opts.from = from;
    const to = this.ymd(this.filterTo.value); if (to) opts.to = to;

    return { subjectId: this.subjectId ?? undefined, page: this.pageIndex, size: this.pageSize, opts };
  }

  private load() {
    const args = this.buildListArgs();

    const hadCache = this.api.isCached(args);

    const stream$ = this.api.listCached(args);

    // Chỉ bật overlay khi KHÔNG có cache (giữ UX mượt)
    (hadCache ? stream$ : stream$.pipe(withLoading(v => this.isLoading = v)))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page: PageResult<FileArchive>) => {
          this.rows = page.content;
          this.total = page.totalElements;
          this.buildColumns(); // status col có thể thay đổi theo filter

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
    // Khi đang lọc theo linkedTaskId (mở từ Exam Task) mà không có file
    if (this.linkedTaskIdFilter && !this.isLoading) {
      return 'File đã bị xoá hoặc không còn tồn tại (HEAD đã xoá).';
    }
    return 'Không có file nào.';
  }

  // ===== Ghi nhớ state per-tab =====
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
    this.exportTab = idx === 0 ? 'PRACTICE' : 'EXAM';

    const saved = this.tabState.get(this.tabKey());
    if (saved) { this.pageIndex = saved.pageIndex; this.pageSize = saved.pageSize; }
    else { this.pageIndex = 0; }

    this.buildColumns(); this.load();
  }

  resetSnooze() {
    this.rr.reset({ clearForever: true }); // chỉ bật lại nhắc (giữ danh sách approved đã seen)
    Swal.fire({ icon: 'success', title: 'Đã bật lại thông báo', timer: 1200, showConfirmButton: false });
    // tuỳ chọn: gọi check ngay để hiện popup nếu có
    this.rr.checkOnEnterDashboard().catch(() => { });
  }

  get isPendingTab() {
    return (this.reviewStatusFilter || '').toUpperCase() === 'PENDING';
  }
}
