import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoginService } from './login.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const login = inject(LoginService);
  const token = login.getToken();
  console.log('Token in interceptor:', token);

  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Modified request:', authReq);
    return next(authReq);
  }

  return next(req);
};


