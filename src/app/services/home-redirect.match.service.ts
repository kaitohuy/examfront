// src/app/services/home-redirect.match.ts
import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlSegment } from '@angular/router';
import { LoginService } from './login.service';
import { catchError, map, of } from 'rxjs';

function dashboardUrlByRoles(roles?: string[]) {
  if (roles?.includes('ADMIN')) return '/admin-dashboard';
  if (roles?.includes('HEAD'))  return '/head-dashboard';
  return '/user-dashboard';
}

export const homeRedirectMatch: CanMatchFn = (route, segments: UrlSegment[]) => {
  const login = inject(LoginService);
  const router = inject(Router);

  // Chưa đăng nhập (hoặc token hết hạn) -> cho match Home
  if (!login.isLoggedIn()) return true;

  // Có user local -> redirect ngay, KHÔNG cho match Home
  const u = login.getUser();
  if (u?.roles?.length) return router.parseUrl(dashboardUrlByRoles(u.roles));

  // Chỉ có token -> gọi current-user rồi redirect
  return login.getCurrentUser().pipe(
    map((user: any) => {
      login.setUser(user);
      return router.parseUrl(dashboardUrlByRoles(user?.roles));
    }),
    // Lỗi thì vẫn cho match Home (tránh chặn cứng)
    catchError(() => of(true))
  );
};
