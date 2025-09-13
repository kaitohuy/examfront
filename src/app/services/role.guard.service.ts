// src/app/services/role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LoginService } from './login.service';

export function roleGuard(allowed: string[]): CanActivateFn {
  return (route, state) => {
    const login = inject(LoginService);
    const router = inject(Router);

    // Chưa đăng nhập → đưa về /login và nhớ returnUrl
    if (!login.isLoggedIn()) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    const user = login.getUser();
    const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];
    const ok = roles.some(r => allowed.includes(r));
    if (ok) return true;

    // Có token nhưng sai quyền → đẩy về dashboard hợp lệ hiện tại
    const redirect =
      roles.includes('ADMIN') ? '/admin-dashboard' :
      roles.includes('HEAD')  ? '/head-dashboard'  :
                                '/user-dashboard';
    return router.createUrlTree([redirect]);
  };
}
