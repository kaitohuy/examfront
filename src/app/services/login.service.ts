// src/app/services/login.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, of, tap } from 'rxjs';
import baseUrl from './helper';

@Injectable({ providedIn: 'root' })
export class LoginService {
  private token: string | null = null;
  public loginStatusSubject = new Subject<boolean>();

  constructor(private http: HttpClient) {}

  getCurrentUser() {
    return this.http.get(`${baseUrl}/current-user`);
  }

  generateToken(loginData: any) {
    return this.http.post(`${baseUrl}/generate-token`, loginData);
  }

  loginUser(token: any) {
    if (typeof localStorage !== 'undefined') {
      this.token = token;
      localStorage.setItem('token', token);
    }
    return true;
  }

  /** Decode an toàn payload JWT (không cần lib ngoài) */
  private decodePayload<T = any>(token: string): T | null {
    try {
      const part = token.split('.')[1];
      if (!part) return null;
      const pad = part.length % 4 === 2 ? '==' : part.length % 4 === 3 ? '=' : '';
      return JSON.parse(atob(part + pad)) as T;
    } catch {
      return null;
    }
  }

  /** Kiểm tra token hết hạn theo 'exp' (giây) */
  public isTokenExpired(token?: string | null): boolean {
    const t = token ?? this.getToken();
    if (!t) return true;
    const payload = this.decodePayload<{ exp?: number }>(t);
    if (!payload?.exp) return false; // nếu BE không set exp thì coi như không biết hạn
    return Date.now() >= payload.exp * 1000;
  }

  /** isLoggedIn: có token và chưa hết hạn. Hết hạn thì dọn localStorage. */
  public isLoggedIn(): boolean {
    if (typeof localStorage === 'undefined') return false;
    const tokenStr = localStorage.getItem('token');
    if (!tokenStr) return false;
    if (this.isTokenExpired(tokenStr)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      return false;
    }
    return true;
  }

  getToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return this.token || localStorage.getItem('token');
    }
    return null;
  }

  /** Chuẩn hoá ngày về 'YYYY-MM-DD' để đồng nhất localStorage */
  private toYMD(v: any): string | null {
    if (!v) return null;
    if (typeof v === 'string') {
      const s = v.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // đã đúng
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
      // dd/MM/yyyy
      const m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
      if (m) return `${m[3]}-${m[2]}-${m[1]}`;
      return null;
    }
    if (v instanceof Date && !Number.isNaN(v.getTime())) {
      const y = v.getFullYear();
      const m = String(v.getMonth() + 1).padStart(2, '0');
      const day = String(v.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return null;
  }

  /** Lưu user vào localStorage (chuẩn hoá birthDate) */
  setUser(user: any) {
    if (typeof localStorage !== 'undefined') {
      const normalized = { ...user, birthDate: this.toYMD(user?.birthDate) };
      localStorage.setItem('user', JSON.stringify(normalized));
      if (normalized?.id != null) localStorage.setItem('userId', String(normalized.id));
    }
  }

  getUser(): any | null {
    if (typeof localStorage !== 'undefined') {
      const str = localStorage.getItem('user');
      return str ? JSON.parse(str) : null;
    }
    return null;
  }

  getUserId(): number | null {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem('userId');
      return v ? Number(v) : null;
    }
    return null;
  }

  logout() {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('token');
      return this.http.post(`${baseUrl}/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      }).pipe(
        tap(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('userId');
        })
      );
    }
    return of(true);
  }

  /** Lấy role ưu tiên: ADMIN > HEAD > TEACHER > USER */
  public getUserRole(): 'ADMIN'|'HEAD'|'TEACHER'| null {
    const user = this.getUser();
    const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];

    if (roles.includes('ADMIN')) return 'ADMIN';
    if (roles.includes('HEAD')) return 'HEAD';
    if (roles.includes('TEACHER')) return 'TEACHER';
    return null;
  }
   forgotPassword(email: string) {
    return this.http.post(`${baseUrl}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string) {
    return this.http.post(`${baseUrl}/auth/reset-password`, { token, newPassword });
  }
}
