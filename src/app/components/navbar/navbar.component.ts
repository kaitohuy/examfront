import { Component, OnInit, HostListener, Inject } from '@angular/core';
import { LoginService } from '../../services/login.service';
import { Router } from '@angular/router';
import baseUrl from '../../services/helper';
import { sharedImports } from '../../shared/shared-imports';
import { DOCUMENT } from '@angular/common';
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    ...sharedImports,

  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {
  isLoggedIn: boolean = false;
  user: any = null;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    public login: LoginService,
    private _router: Router,
  ) { }

  ngOnInit(): void {
    this.isLoggedIn = this.login.isLoggedIn();
    this.user = this.login.getUser();
    this.login.loginStatusSubject.asObservable().subscribe((data: any) => {
      this.isLoggedIn = this.login.isLoggedIn();
      this.user = this.login.getUser();
    });
  }

  // Đây là sự kiện "trước khi unload"
  @HostListener('window:beforeunload')
  beforeUnloadHandler() {
    // const token = this.login.getToken();
    // if (!token) return;
    // const url = `${baseUrl}/logout-silent?token=${encodeURIComponent(token)}`;
    // this.isLoggedIn = false;
    // this.login.loginStatusSubject.next(false);
    // localStorage.removeItem("token");
    // localStorage.removeItem("user");
    // // sendBeacon chỉ gửi URL (không cần body)
    // navigator.sendBeacon(url);
  }

  public logout() {
    this.login.logout().subscribe({
      next: (data: any) => {
        this.isLoggedIn = false;
        this.login.loginStatusSubject.next(false);
        this._router.navigate(['/']);
      },
      error: (err: any) => {
        console.error("Logout error", err);
      }
    });
  }
}
