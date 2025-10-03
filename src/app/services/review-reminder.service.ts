// src/app/services/review-reminder.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { FileArchiveService } from './file-archive.service';
import { LoginService } from './login.service';
import {
  ReviewReminderDialogComponent,
  ReviewReminderDialogData,
  ReviewReminderDialogResult
} from '../pages/admin/reminder-dialog/reminder-dialog.component';
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

  // flag để biết đang chạy trong browser hay không
  private isBrowser = false;

  constructor(
    private fa: FileArchiveService,
    private login: LoginService,
    private dialog: MatDialog,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async checkOnEnterDashboard(): Promise<void> {
    if (!this.isBrowser) return; // ⬅️ không chạy popup ngoài browser
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
    const rejected  = (rejectedPage?.content ?? []) as ReviewItem[];
    const seen = this.getApprovedSeen();
    const newApproved = approved.filter(x => !seen.has(x.id));
    const upcomings = rejected.filter(x => {
      if (!x.reviewDeadline) return false;
      const t = new Date(x.reviewDeadline).getTime();
      return Number.isFinite(t) && t > now;
    });

    if (!allowPopup) return;
    if ((newApproved.length + upcomings.length) === 0) return;

    const data: ReviewReminderDialogData = { approved: newApproved, deadlines: upcomings };
    const ref = this.dialog.open<ReviewReminderDialogComponent, ReviewReminderDialogData, ReviewReminderDialogResult>(
      ReviewReminderDialogComponent,
      { width: '500px', data, autoFocus: false, disableClose: false, panelClass: 'ep-dialog' }
    );

    const result = await firstValueFrom(ref.afterClosed());
    const choice = (result?.snooze ?? 'none') as SnoozeChoice;
    this.applySnooze(choice);

    if (newApproved.length) this.addApprovedSeen(newApproved.map(x => x.id));
  }

  private lsGet(key: string): string | null {
    if (!this.isBrowser) return null;
    try { return localStorage.getItem(key); } catch { return null; }
  }
  private lsSet(key: string, val: string): void {
    if (!this.isBrowser) return;
    try { localStorage.setItem(key, val); } catch {}
  }
  private lsRemove(key: string): void {
    if (!this.isBrowser) return;
    try { localStorage.removeItem(key); } catch {}
  }

  private applySnooze(choice: SnoozeChoice) {
    const now = Date.now();
    switch (choice) {
      case 'none':   this.clearSnooze(); this.setForever(false); break;
      case '1h':     this.setSnoozeUntil(now +  1 * 60 * 60 * 1000); this.setForever(false); break;
      case '3h':     this.setSnoozeUntil(now +  3 * 60 * 60 * 1000); this.setForever(false); break;
      case '24h':    this.setSnoozeUntil(now + 24 * 60 * 60 * 1000); this.setForever(false); break;
      case 'forever': this.clearSnooze(); this.setForever(true); break;
    }
  }

  private getApprovedSeen(): Set<number> {
    try {
      const raw = this.lsGet(this.KEY_APPROVED_SEEN);
      const arr = raw ? (JSON.parse(raw) as number[]) : [];
      return new Set<number>(Array.isArray(arr) ? arr : []);
    } catch { return new Set<number>(); }
  }

  private addApprovedSeen(ids: number[]): void {
    const s = this.getApprovedSeen();
    ids.forEach(id => s.add(id));
    this.lsSet(this.KEY_APPROVED_SEEN, JSON.stringify(Array.from(s)));
  }

  private getSnoozeUntil(): number | null {
    const v = this.lsGet(this.KEY_SNOOZE_UNTIL);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private setSnoozeUntil(ts: number) { this.lsSet(this.KEY_SNOOZE_UNTIL, String(ts)); }
  private clearSnooze() { this.lsRemove(this.KEY_SNOOZE_UNTIL); }

  private getForever(): boolean { return this.lsGet(this.KEY_FOREVER) === '1'; }
  private setForever(on: boolean) { on ? this.lsSet(this.KEY_FOREVER, '1') : this.lsRemove(this.KEY_FOREVER); }

  reset(opts?: { clearForever?: boolean; clearApprovedSeen?: boolean }) {
    this.lsRemove(this.KEY_SNOOZE_UNTIL);
    if (opts?.clearForever !== false) this.lsRemove(this.KEY_FOREVER);
    if (opts?.clearApprovedSeen) this.lsRemove(this.KEY_APPROVED_SEEN);
  }

  getMuteStatus() {
    const snooze = this.getSnoozeUntil();
    const forever = this.getForever();
    return { forever, snoozeUntil: snooze };
  }

  setMuted(on: boolean) { this.setForever(on); if (!on) this.clearSnooze(); }
  isMuted(): boolean { return this.getForever(); }
}
