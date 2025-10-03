import { Component, OnInit, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { LoginService } from '../../services/login.service';
import { NotificationService } from '../../services/notification.service';
import { ReviewReminderService } from '../../services/review-reminder.service';
import { sharedImports } from '../../shared/shared-imports';
import { NotificationItem } from '../../models/notification';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    ...sharedImports,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    MatToolbarModule,
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  isLoggedIn = false;
  user: any = null;

  // ===== Notifications (bell) =====
  unread = 0;
  muted = false;

  items: NotificationItem[] = [];
  page = 0;
  size = 5;
  hasMore = false;

  private markCooldownMs = 3000;
  private lastMarkAllTs = 0;
  private marking = false;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    public login: LoginService,
    private router: Router,
    private notif: NotificationService,
    private rr: ReviewReminderService
  ) { }

  ngOnInit(): void {
    // auth state
    this.isLoggedIn = this.login.isLoggedIn();
    this.user = this.login.getUser();
    this.login.loginStatusSubject.asObservable().subscribe(() => {
      this.isLoggedIn = this.login.isLoggedIn();
      this.user = this.login.getUser();
      if (this.isLoggedIn) this.refreshUnread();
    });

    // badge lần đầu + theo dõi biến unread
    this.refreshUnread();
    this.notif.watchUnread().subscribe(n => { if (n != null) this.unread = n; });

    // trạng thái mute (dựa trên service hiện có)
    const st = this.rr.getMuteStatus?.();
    this.muted = !!st?.forever;
  }

  // ===== Bell helpers =====
  private refreshUnread() {
    if (!this.isLoggedIn) { this.unread = 0; return; }
    this.notif.unreadCount().subscribe(n => this.unread = n);
  }

  onNotifMenuOpened() {
    this.loadNotifs(true);

    const now = Date.now();
    if ((this.unread || 0) > 0 && !this.marking && (now - this.lastMarkAllTs) > this.markCooldownMs) {
      this.marking = true;
      this.notif.markAllRead().subscribe({
        next: () => {
          this.lastMarkAllTs = Date.now();
          this.unread = 0;
          const ts = new Date().toISOString();
          this.items = this.items.map(x => ({ ...x, isRead: true, readAt: x.readAt ?? ts }));
        },
        error: err => console.error('markAllRead error:', err)
      }).add(() => this.marking = false);
    }
  }

  loadNotifs(reset = false) {
    if (!this.isLoggedIn) return;
    if (reset) { this.page = 0; this.items = []; this.hasMore = false; }
    this.notif.list(this.page, this.size).subscribe({
      next: (res) => {
        const content = res?.content ?? [];
        this.items = [...this.items, ...content];
        this.hasMore = res.number < (res.totalPages - 1);
        this.page = res.number + 1;
      },
      error: (err) => console.error('Load notifications error:', err)
    });
  }

  deleteNotif(n: NotificationItem, ev: Event) {
    ev.stopPropagation();
    // với schema mới có isRead, fallback sang readAt để tương thích
    const wasUnread = !(n.isRead || !!n.readAt);

    this.notif.delete(n.id, wasUnread).subscribe({
      next: () => {
        this.items = this.items.filter(x => x.id !== n.id);
        // nếu xóa 1 bản ghi chưa đọc (hiếm, vì đã markAllRead khi mở)
        if (wasUnread) this.notif.unreadCount(true).subscribe(nc => this.unread = nc);
      },
      error: (err) => console.error('Delete notification error:', err)
    });
  }

  loadMore(ev: Event) {
    ev.stopPropagation();
    this.loadNotifs(false);
  }

  toggleMute(ev: Event) {
    ev.stopPropagation();
    if (this.muted) {
      this.rr.reset({ clearForever: true });
      this.muted = false;
    } else {
      localStorage.setItem('rr_forever', '1');
      this.muted = true;
    }
  }

  // ===== Avatar / Profile / Logout =====
  get avatarUrl(): string {
    if (!this.user) return '../../../assets/images/male.png';
    return this.user.gender === 'FEMALE'
      ? '../../../assets/images/female.png'
      : '../../../assets/images/male.png';
  }

  get profileLink(): string {
    const role = this.login.getUserRole();
    if (role === 'ADMIN') return '/admin-dashboard/profile';
    if (role === 'HEAD') return '/head-dashboard/profile';
    return '/user-dashboard/profile';
  }

  public logout() {
    this.login.logout().subscribe({
      next: () => {
        this.isLoggedIn = false;
        this.login.loginStatusSubject.next(false);
        this.router.navigate(['/login']);
      },
      error: (err: any) => {
        console.error('Logout error', err);
        this.router.navigate(['/login']);
      }
    });
  }
}
