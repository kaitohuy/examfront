// src/app/services/review-reminder.service.ts
import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';
import { FileArchiveService } from './file-archive.service';
import { LoginService } from './login.service';

type SnoozeChoice = '1h' | '3h' | '24h' | 'forever' | 'none';

interface ReviewItem {
  id: number;
  filename: string;
  subjectName?: string;
  reviewStatus?: 'APPROVED' | 'REJECTED' | 'PENDING' | null;
  reviewedAt?: string | null;
  reviewDeadline?: string | null;
  reviewedByName?: string | null;
  reviewNote?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ReviewReminderService {
  private KEY_SNOOZE_UNTIL = 'rr_snooze_until';
  private KEY_FOREVER = 'rr_forever';
  private KEY_APPROVED_SEEN = 'rr_approved_seen_ids'; // JSON: number[]

  constructor(
    private fa: FileArchiveService,
    private login: LoginService
  ) { }

  /** Gọi ở Dashboard (sau login). */
  async checkOnEnterDashboard(): Promise<void> {
    // Nếu đã tắt vĩnh viễn -> thôi
    if (this.getForever()) return;

    // Nếu đang snooze -> chỉ NHẮC DEADLINE nếu snooze đã hết; approved thì không nhắc lại
    const now = Date.now();
    const snoozeUntil = this.getSnoozeUntil();
    const allowPopup = !snoozeUntil || now >= snoozeUntil;

    // Lấy username hiện tại để lọc uploader
    const me = this.login.getUser();
    const uploader = me?.username || '';

    // Lấy 2 lượt: APPROVED + REJECTED
    const optsBase = { kind: 'EXPORT' as const };
    const [approvedPage, rejectedPage] = await Promise.all([
      firstValueFrom(this.fa.list(undefined, 0, 50, { ...optsBase, reviewStatus: 'APPROVED', uploader })),
      firstValueFrom(this.fa.list(undefined, 0, 50, { ...optsBase, reviewStatus: 'REJECTED', uploader })),
    ]);

    const approved = (approvedPage?.content ?? []) as ReviewItem[];
    const rejected = (rejectedPage?.content ?? []) as ReviewItem[];

    // Lọc APPROVED: chỉ những cái CHƯA thông báo lần nào
    const seen = this.getApprovedSeen();
    const newApproved = approved.filter(x => !seen.has(x.id));

    // Lọc REJECTED: còn deadline trong tương lai
    const upcomings = rejected.filter(x => {
      if (!x.reviewDeadline) return false;
      const t = new Date(x.reviewDeadline).getTime();
      return Number.isFinite(t) && t > now;
    });

    // Nếu đang snooze và chưa hết hạn -> bỏ qua popup
    if (!allowPopup) return;

    // Logic hiển thị:
    // - Nếu có "newApproved" (chưa báo) và/hoặc "upcomings" (deadline tới), mở 1 popup gộp.
    if ((newApproved.length + upcomings.length) === 0) return;

    await this.showPopup(newApproved, upcomings);

    // Đánh dấu APPROVED đã báo để lần sau KHÔNG báo lại nữa
    if (newApproved.length) {
      const ids = newApproved.map(x => x.id);
      this.addApprovedSeen(ids);
    }
  }

  // ---------- UI (Swal) ----------
  private async showPopup(approved: ReviewItem[], deadlines: ReviewItem[]) {
    const fmtVi = (iso?: string | null) =>
      iso ? new Date(iso).toLocaleString('vi-VN') : '';

    const hasApproved = approved.length > 0;
    const hasDeadlines = deadlines.length > 0;

    const htmlParts: string[] = [];

    if (hasApproved) {
      htmlParts.push(`
      <div class="text-start mb-2">
        <div class="fw-semibold mb-1">Đã được duyệt</div>
        <ul class="mb-0 ps-3">
          ${approved.map(a => `
            <li>
              ${this.escape(a.filename)}
              <span class="text-muted">(${this.escape(a.subjectName || '')})</span>
              <div class="small text-muted">
                Lúc: ${fmtVi(a.reviewedAt)}${a.reviewedByName ? ` • bởi ${this.escape(a.reviewedByName)}` : ''}
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    `);
    }

    if (hasDeadlines) {
      htmlParts.push(`
      <div class="text-start mb-2">
        <div class="fw-semibold mb-1">Bị từ chối (có hạn xử lý)</div>
        <ul class="mb-0 ps-3">
          ${deadlines.map(d => `
          <li>
            ${this.escape(d.filename)}
            <span class="text-muted">(${this.escape(d.subjectName || '')})</span>
            <div class="small text-muted">
              Hạn: ${fmtVi(d.reviewDeadline)}${d.reviewedByName ? ` • bởi ${this.escape(d.reviewedByName)}` : ''}
            </div>
            ${d.reviewNote ? `<div class="small">Lý do: ${this.escape(d.reviewNote)}</div>` : ''} 
          </li>
        `).join('')}
        </ul>
      </div>
    `);
    }

    // Dropdown ngắn gọn, không fixed width, dùng class Bootstrap để auto fit
    htmlParts.push(`
    <hr class="my-2">
    <div class="text-start">
      <label class="form-label fw-semibold mb-1">Tạm ẩn thông báo</label>
      <select id="rr_snooze_select" class="form-select form-select-sm">
        <option value="none">Không tạm ẩn</option>
        <option value="1h">1 giờ</option>
        <option value="3h">3 giờ</option>
        <option value="24h">24 giờ</option>
        <option value="forever">Vĩnh viễn</option>
      </select>
    </div>
  `);

    await Swal.fire({
      icon: 'info',
      title: 'Thông báo duyệt file',
      html: htmlParts.join(''),
      confirmButtonText: 'Đóng',
      // Không fix width để tránh tràn – để SweetAlert tự canh.
      customClass: {
        popup: 'rr-swal-popup'
      },
      willClose: () => {
        const sel = document.getElementById('rr_snooze_select') as HTMLSelectElement | null;
        const choice = (sel?.value || 'none') as SnoozeChoice;
        this.applySnooze(choice);
      }
    });
  }

  private applySnooze(choice: SnoozeChoice) {
    const now = Date.now();
    switch (choice) {
      case 'none':
        this.clearSnooze();
        this.setForever(false);
        break;
      case '1h':
        this.setSnoozeUntil(now + 60 * 60 * 1000);
        this.setForever(false);
        break;
      case '3h':
        this.setSnoozeUntil(now + 3 * 60 * 60 * 1000);
        this.setForever(false);
        break;
      case '24h':
        this.setSnoozeUntil(now + 24 * 60 * 60 * 1000);
        this.setForever(false);
        break;
      case 'forever':
        this.clearSnooze();
        this.setForever(true);
        break;
    }
  }

  // ---------- LocalStorage helpers ----------
  private getApprovedSeen(): Set<number> {
    try {
      const raw = localStorage.getItem(this.KEY_APPROVED_SEEN);
      if (!raw) return new Set<number>();
      const arr = JSON.parse(raw) as number[];
      return new Set<number>(Array.isArray(arr) ? arr : []);
    } catch { return new Set<number>(); }
  }

  private addApprovedSeen(ids: number[]): void {
    const s = this.getApprovedSeen();
    ids.forEach(id => s.add(id));
    localStorage.setItem(this.KEY_APPROVED_SEEN, JSON.stringify(Array.from(s)));
  }

  private getSnoozeUntil(): number | null {
    const v = localStorage.getItem(this.KEY_SNOOZE_UNTIL);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private setSnoozeUntil(ts: number) {
    localStorage.setItem(this.KEY_SNOOZE_UNTIL, String(ts));
  }

  private clearSnooze() {
    localStorage.removeItem(this.KEY_SNOOZE_UNTIL);
  }

  private getForever(): boolean {
    return localStorage.getItem(this.KEY_FOREVER) === '1';
  }

  private setForever(on: boolean) {
    if (on) localStorage.setItem(this.KEY_FOREVER, '1');
    else localStorage.removeItem(this.KEY_FOREVER);
  }

  private escape(s: string) {
    return (s || '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
    );
  }

  reset(opts?: { clearForever?: boolean; clearApprovedSeen?: boolean }) {
    localStorage.removeItem(this.KEY_SNOOZE_UNTIL);
    if (opts?.clearForever !== false) localStorage.removeItem(this.KEY_FOREVER);
    if (opts?.clearApprovedSeen) localStorage.removeItem(this.KEY_APPROVED_SEEN);
  }

  /** Tiện ích để hiển thị trạng thái hiện tại (nếu muốn). */
  getMuteStatus() {
    const snooze = this.getSnoozeUntil();
    const forever = this.getForever();
    return { forever, snoozeUntil: snooze };
  }
}
