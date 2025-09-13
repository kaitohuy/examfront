// src/app/services/home-redirect.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LoginService } from './login.service';
import { catchError, map, of } from 'rxjs';

function dashboardUrlByRoles(roles?: string[]): string {
  if (roles?.includes('ADMIN')) return '/admin-dashboard';
  if (roles?.includes('HEAD'))  return '/head-dashboard';
  return '/user-dashboard';
}

export const homeRedirectGuard: CanActivateFn = (route, state) => {
  const login = inject(LoginService);
  const router = inject(Router);

  // 1) Không đăng nhập (hoặc token hết hạn) → vào Home bình thường
  if (!login.isLoggedIn()) return true;

  // 2) Có user sẵn trong localStorage → chuyển hướng ngay
  const localUser = login.getUser();
  if (localUser?.roles?.length) {
    return router.parseUrl(dashboardUrlByRoles(localUser.roles));
  }

  // 3) Chỉ có token → gọi current-user, lưu user rồi chuyển
  return login.getCurrentUser().pipe(
    map((u: any) => {
      login.setUser(u);
      return router.parseUrl(dashboardUrlByRoles(u?.roles));
    }),
    catchError(() => of(true)) // lỗi thì vẫn cho ở Home
  );
};

/** (Tuỳ chọn) Đã đăng nhập thì không cho vào /login */
export const blockLoginWhenAuthedGuard: CanActivateFn = (route, state) => {
  const login = inject(LoginService);
  const router = inject(Router);
  if (!login.isLoggedIn()) return true;

  const u = login.getUser();
  return router.parseUrl(dashboardUrlByRoles(u?.roles));
};
