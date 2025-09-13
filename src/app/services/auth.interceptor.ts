// import { HttpInterceptorFn } from '@angular/common/http';
// import { inject } from '@angular/core';
// import { LoginService } from './login.service';

// export const authInterceptor: HttpInterceptorFn = (req, next) => {
//   const login = inject(LoginService);
//   const token = login.getToken();
//   console.log('Token in interceptor:', token);

//   if (token) {
//     const authReq = req.clone({
//       setHeaders: {
//         Authorization: `Bearer ${token}`
//       }
//     });
//     console.log('Modified request:', authReq);
//     return next(authReq);
//   }

//   return next(req);
// };

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoginService } from './login.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const login = inject(LoginService);
  const token = login.getToken();
  const url = req.url || '';

  // Các endpoint công khai (không cần token)
  const isPublic =
    url.includes('/generate-token') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password') ||
    (url.endsWith('/user/') && req.method === 'POST') ||
    req.method === 'OPTIONS';

  // Không gắn Authorization nếu public hoặc token rỗng/invalid
  if (isPublic || !token || token === 'null' || token === 'undefined') {
    return next(req);
  }

  const authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  return next(authReq);
};
