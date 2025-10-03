import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

import baseUrl from './helper';
import { PageResult } from '../models/pageResult';
import { NotificationItem } from '../models/notification';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private base = `${baseUrl}/api/notifications`;

  // cache đơn giản cho unread count
  private unread$ = new BehaviorSubject<number | null>(null);

  constructor(private http: HttpClient) { }

  list(page = 0, size = 10): Observable<PageResult<NotificationItem>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResult<NotificationItem>>(this.base, { params });
  }

  /** Lấy số thông báo chưa đọc; nếu đã có cache thì trả ngay */
  unreadCount(force = false): Observable<number> {
    if (!force) {
      const cached = this.unread$.value;
      if (cached != null) return of(cached);
    }
    return this.http.get<number>(`${this.base}/unread-count`).pipe(
      tap(n => this.unread$.next(n))
    );
  }

  /** Observable để Bell component subscribe (nếu bạn muốn hiển thị realtime trong FE) */
  watchUnread(): Observable<number | null> { return this.unread$.asObservable(); }

  /** Đánh dấu 1 thông báo đã đọc */
  markRead(id: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/read`, {}).pipe(
      tap(() => this.bumpUnread(-1))
    );
  }

  /** Đánh dấu tất cả đã đọc */
  markAllRead(): Observable<number> {
    return this.http.post<number>(`${this.base}/read-all`, {}).pipe(
      tap(() => this.unread$.next(0))
    );
  }

  /** Invalidate để lần gọi sau fetch lại từ server */
  invalidateUnread(): void { this.unread$.next(null); }

  /** Tăng/giảm cache cục bộ cho mượt (nếu có) */
  private bumpUnread(delta: number) {
    const cur = this.unread$.value;
    if (cur == null) return; // chưa cache thì bỏ qua
    const next = Math.max(0, cur + delta);
    this.unread$.next(next);
  }

  delete(id: number, wasUnread = false) {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(
      tap(() => { if (wasUnread) this.bumpUnread(-1); })
    );
  }
}
