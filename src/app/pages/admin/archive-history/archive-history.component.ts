import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, Subject, takeUntil, finalize } from 'rxjs';
import Swal from 'sweetalert2';

import { FileArchiveService } from '../../../services/file-archive.service';
import { FileArchive, ReviewStatus } from '../../../models/fileArchive';
import { PageResult } from '../../../models/pageResult';
import { ArchiveQuery } from '../../../models/ArchiveQuery';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { sharedImports } from '../../../shared/shared-imports';

// Datepicker
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { VN_DATE_FORMATS } from '../../../models/dateFormats';

type ARStatus = 'ALL' | Extract<ReviewStatus, 'APPROVED' | 'REJECTED'>;

@Component({
  selector: 'app-archive-history',
  standalone: true,
  imports: [
    ...sharedImports
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' },
    { provide: MAT_DATE_FORMATS, useValue: VN_DATE_FORMATS }
  ],
  templateUrl: './archive-history.component.html',
  styleUrls: ['./archive-history.component.css']
})
export class ArchiveHistoryComponent implements OnInit, OnDestroy {
  private api = inject(FileArchiveService);

  // ===== bộ lọc =====
  showFilters = false;

  q = new FormControl<string>('', { nonNullable: true });
  statusSel = new FormControl<ARStatus>('ALL', { nonNullable: true });      // ⬅️ mặc định ALL
  subjectText = new FormControl<string>('', { nonNullable: true });
  from = new FormControl<Date | null>(null); // dùng Datepicker
  to = new FormControl<Date | null>(null);

  // ===== table =====
  displayedColumns = ['filename', 'subject', 'status', 'reviewer', 'reviewedAt', 'actions'];
  rows: FileArchive[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;

  loading = false;
  downloading = new Set<number>();

  private destroy$ = new Subject<void>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    this.q.valueChanges.pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => { this.pageIndex = 0; this.load(); });

    this.statusSel.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => { this.pageIndex = 0; this.load(); });

    this.load();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  // ===== paging =====
  onPage(e: PageEvent) { this.pageIndex = e.pageIndex; this.pageSize = e.pageSize; this.load(); }

  // ===== filter actions =====
  toggleFilters() { this.showFilters = !this.showFilters; }
  applyFilters() { this.pageIndex = 0; this.load(); }
  clearClientFilters() {
    this.subjectText.setValue('');
    this.from.setValue(null);
    this.to.setValue(null);
    this.pageIndex = 0;
    this.load();
  }

  private ymd(d?: Date | null) {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  private buildArgs(): {
    subjectId?: number;
    page: number;
    size: number;
    // cho phép truyền chuỗi ghép để BE hiểu
    opts: ArchiveQuery & { kind: 'EXPORT'; variant: 'EXAM'; reviewStatus: string }
  } {
    const opts: any = { kind: 'EXPORT', variant: 'EXAM' };

    const q = this.q.value?.trim(); if (q) opts.q = q;
    const subj = this.subjectText.value?.trim(); if (subj) opts.subject = subj;

    const f = this.ymd(this.from.value); if (f) opts.from = f;
    const t = this.ymd(this.to.value); if (t) opts.to = t;

    // ⬇️ ALL => gửi “APPROVED,REJECTED”
    const s = this.statusSel.value;
    opts.reviewStatus = (s === 'ALL') ? 'APPROVED,REJECTED' : s;

    return { page: this.pageIndex, size: this.pageSize, opts };
  }

  load() {
    const args = this.buildArgs();
    this.loading = true;
    this.api.list(args.subjectId, args.page, args.size, args.opts)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (page: PageResult<FileArchive>) => {
          this.rows = page.content;
          this.total = page.totalElements;
        },
        error: err => {
          Swal.fire('Lỗi', 'Không tải được lịch sử duyệt.', 'error');
          console.error(err);
        }
      });
  }

  // ===== actions =====
  view(r: FileArchive, ev?: MouseEvent) {
    ev?.stopPropagation();
    const win = window.open('about:blank', '_blank');
    this.api.getViewUrl(r.id).subscribe({
      next: ({ url }) => { if (!url) { win?.close(); return; } try { win!.location.replace(url); } catch { win?.close(); window.open(url, '_blank'); } },
      error: err => { win?.close(); Swal.fire('Lỗi', 'Không lấy được link xem file.', 'error'); console.error(err); }
    });
  }

  download(r: FileArchive, ev?: MouseEvent) {
    ev?.stopPropagation();
    if (this.downloading.has(r.id)) return;
    this.downloading.add(r.id);
    this.api.getDownloadUrl(r.id)
      .pipe(finalize(() => this.downloading.delete(r.id)))
      .subscribe({
        next: ({ url }) => { const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); },
        error: err => { Swal.fire('Lỗi', 'Không lấy được link tải.', 'error'); console.error(err); }
      });
  }

  openInfo(r: FileArchive) {
    const s = (r.reviewStatus || '').toUpperCase();
    const title = s === 'APPROVED' ? 'Đã duyệt' : s === 'REJECTED' ? 'Bị từ chối' : 'Thông tin';
    const reviewedAt = r.reviewedAt ? new Date(r.reviewedAt).toLocaleString('vi-VN') : '—';
    const dl = r.reviewDeadline ? new Date(r.reviewDeadline as any).toLocaleString('vi-VN') : '—';
    const reviewer = r.reviewedByName || '—';

    Swal.fire({
      title,
      html: `
        <div class="text-start small">
          <div><b>File:</b> ${this.escape(r.filename)}</div>
          <div><b>Môn:</b> ${this.escape(r.subjectName || ('#' + r.subjectId))}</div>
          <div><b>Người duyệt:</b> ${this.escape(reviewer)}</div>
          <div><b>Thời điểm duyệt:</b> ${this.escape(reviewedAt)}</div>
          ${s === 'REJECTED' ? `
            <div><b>Lý do:</b> ${this.escape(r.reviewNote || '(không có)')}</div>
            <div><b>Deadline:</b> ${this.escape(dl)}</div>` : ''}
        </div>
      `,
      showCancelButton: true,
      cancelButtonText: 'Đóng',
      confirmButtonText: 'Xem file',
    }).then(res => { if (res.isConfirmed) this.view(r); });
  }

  // ===== helpers =====
  iconClass(r: FileArchive) {
    const name = (r.filename || '').toLowerCase();
    const mime = (r.mimeType || '').toLowerCase();
    if (mime.includes('pdf') || name.endsWith('.pdf')) return 'bi bi-filetype-pdf fs-4 file-icon';
    if (name.endsWith('.doc') || name.endsWith('.docx') || mime.includes('word')) return 'bi bi-filetype-docx fs-4 file-icon';
    return 'bi bi-file-earmark fs-4 file-icon';
  }

  statusBadge(s?: ReviewStatus | null) {
    const v = String(s || '').toUpperCase();
    return v === 'APPROVED' ? 'badge rounded-pill px-3 py-2 text-bg-success'
      : v === 'REJECTED' ? 'badge rounded-pill px-3 py-2 text-bg-danger'
        : 'badge rounded-pill px-3 py-2 text-bg-secondary';
  }

  rejectTooltip(r: FileArchive): string {
    if ((r.reviewStatus || '').toUpperCase() !== 'REJECTED') return '';
    const note = r.reviewNote ? `Lý do: ${r.reviewNote}` : 'Lý do: (không có)';
    const dl = r.reviewDeadline ? `\nHạn: ${new Date(r.reviewDeadline as any).toLocaleString('vi-VN')}` : '';
    return note + dl;
  }

  private escape(s: any) {
    const str = String(s ?? '');
    return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  }
}
