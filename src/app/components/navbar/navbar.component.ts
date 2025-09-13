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

  get profileLink(): string {
    const role = this.login.getUserRole();
    if (role === 'ADMIN') return '/admin-dashboard/profile';
    if (role === 'HEAD') return '/head-dashboard/profile';
    return '/user-dashboard/profile';
  }


  public logout() {
    this.login.logout().subscribe({
      next: () => {
        this.isLoggedIn = false;
        this.login.loginStatusSubject.next(false);
        this._router.navigate(['/login']);
      },
      error: (err: any) => {
        console.error('Logout error', err);
        this._router.navigate(['/login']);
      }
    });
  }
}
