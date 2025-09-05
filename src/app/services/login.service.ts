import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, of, tap } from 'rxjs';
import baseUrl from './helper';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  private token: string | null = null;

  public loginStatusSubject = new Subject<boolean>();

  constructor(private http: HttpClient) { }

  public getCurrentUser() {
    return this.http.get(`${baseUrl}/current-user`);
  }

  public generateToken(loginData: any) {
    return this.http.post(`${baseUrl}/generate-token`, loginData);
  }

  public loginUser(token: any) {
    if (typeof localStorage !== 'undefined') {
      this.token = token;
      localStorage.setItem("token", token);
    }
    return true;
  }

  public isLoggedIn(): boolean {
    if (typeof localStorage !== 'undefined') {
      const tokenStr = localStorage.getItem("token");
      return tokenStr !== null && tokenStr.length > 0;
    }
    return false;
  }

  // public logout() {
  //   if (typeof localStorage !== 'undefined') {
  //     const token = localStorage.getItem("token");
  //     localStorage.removeItem("token");
  //     localStorage.removeItem("user");
  //     return this.http.post(`${baseUrl}/logout`, {}, {
  //       headers: {
  //         Authorization: `Bearer ${token}`
  //       }
  //     }).pipe(
  //       tap(() => {
  //         localStorage.removeItem("token");
  //         localStorage.removeItem("user");
  //       })
  //     );
  //   }
  //   return of(true);
  // }

  public getToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return this.token || localStorage.getItem('token');
    }
    return null;
  }

  public setUser(user: any) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
      // => LƯU THÊM userId riêng
      if (user?.id != null) {
        localStorage.setItem('userId', String(user.id));
      }
    }
  }

  /** Lấy user object (JSON) */
  public getUser(): any | null {
    if (typeof localStorage !== 'undefined') {
      const str = localStorage.getItem('user');
      return str ? JSON.parse(str) : null;
    }
    return null;
  }

  /** Lấy userId đã lưu riêng */
  public getUserId(): number | null {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem('userId');
      return v ? Number(v) : null;
    }
    return null;
  }

  /** Dọn dẹp localStorage khi logout */
  public logout() {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('token');
      return this.http.post(`${baseUrl}/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).pipe(
        tap(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('userId');   // <— nhớ xoá userId luôn
        })
      );
    }
    return of(true);
  }


  public getUserRole(): string | null {
    const user = this.getUser();
    if (user && Array.isArray(user.roles)) {
      // ưu tiên ADMIN
      if (user.roles.includes('ADMIN')) { return 'ADMIN'; }
      if (user.roles.includes('HEAD')) { return 'HEAD'; }
      if (user.roles.includes('TEACHER')) { return 'TEACHER'; }
    }
    return null;
  }

}