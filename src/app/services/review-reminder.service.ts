// src/app/services/review-reminder.service.ts
import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';
import { FileArchiveService } from './file-archive.service';
import { LoginService } from './login.service';
import { ReviewReminderDialogComponent, ReviewReminderDialogData, ReviewReminderDialogResult } from '../pages/admin/reminder-dialog/reminder-dialog.component';
import { MatDialog } from '@angular/material/dialog';

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
    private login: LoginService,
    private dialog: MatDialog
  ) { }

  async checkOnEnterDashboard(): Promise<void> {
    if (this.getForever()) return;
    const now = Date.now();
    const snoozeUntil = this.getSnoozeUntil();
    const allowPopup = !snoozeUntil || now >= snoozeUntil;
    const me = this.login.getUser();
    const uploader = me?.username || '';
    const optsBase = { kind: 'EXPORT' as const };
    const [approvedPage, rejectedPage] = await Promise.all([
      firstValueFrom(this.fa.list(undefined, 0, 50, { ...optsBase, reviewStatus: 'APPROVED', uploader })),
      firstValueFrom(this.fa.list(undefined, 0, 50, { ...optsBase, reviewStatus: 'REJECTED', uploader })),
    ]);

    const approved = (approvedPage?.content ?? []) as ReviewItem[];
    const rejected = (rejectedPage?.content ?? []) as ReviewItem[];
    const seen = this.getApprovedSeen();
    const newApproved = approved.filter(x => !seen.has(x.id));
    const upcomings = rejected.filter(x => {
      if (!x.reviewDeadline) return false;
      const t = new Date(x.reviewDeadline).getTime();
      return Number.isFinite(t) && t > now;
    });
    if (!allowPopup) return;
    if ((newApproved.length + upcomings.length) === 0) return;

    await this.showPopup(newApproved, upcomings);
    if (newApproved.length) {
      const ids = newApproved.map(x => x.id);
      this.addApprovedSeen(ids);
    }
  }

  // ---------- UI (Swal) ----------
  private async showPopup(approved: ReviewItem[], deadlines: ReviewItem[]) {
    const data: ReviewReminderDialogData = { approved, deadlines };
    const ref = this.dialog.open<ReviewReminderDialogComponent, ReviewReminderDialogData, ReviewReminderDialogResult>(
      ReviewReminderDialogComponent,
      {
        width: '500px',
        data,
        autoFocus: false,
        disableClose: false,
        panelClass: 'ep-dialog'
      }
    );

    const result = await ref.afterClosed().toPromise();
    const choice = (result?.snooze ?? 'none') as SnoozeChoice;
    this.applySnooze(choice);
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
