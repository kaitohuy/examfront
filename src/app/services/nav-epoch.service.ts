import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject, filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NavEpochService {
  private _epoch = 0;
  private _lastGroup = '';
  readonly epoch$ = new BehaviorSubject<number>(0);

  constructor(router: Router) {
    router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        const url = router.url.split('?')[0];         // bỏ query
        const group = this.parentGroupOf(url);        // xác định “trang cha”
        if (group !== this._lastGroup) {
          this._lastGroup = group;
          this._epoch++;
          this.epoch$.next(this._epoch);
        }
      });
  }

  get epoch(): number { return this._epoch; }

  /** Quy ước: nhóm theo 2 segment đầu (ví dụ: /admin/archive/..., /admin/department/..., /user-dashboard/archive/...) */
  private parentGroupOf(url: string): string {
    const seg = url.split('/').filter(Boolean);
    // Chuẩn hoá một chút cho quen với sidebar của bạn:
    // admin/archive/...  => "admin|archive"
    // admin/department...=> "admin|department"
    // user-dashboard/archive/... => "user-dashboard|archive"
    const a = seg[0] ?? 'root';
    const b = seg[1] ?? 'home';
    return `${a}|${b}`;
  }
}
