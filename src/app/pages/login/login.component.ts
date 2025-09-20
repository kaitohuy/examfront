// src/app/pages/login/login.component.ts
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
import { DOCUMENT, NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { sharedImports } from '../../shared/shared-imports';
import { LoadingScreenComponent } from '../loading-screen/loading-screen.component';
import { LoginService } from '../../services/login.service';
import { ReviewReminderService } from '../../services/review-reminder.service';

import { withLoading } from '../../shared/with-loading';
import { catchError, EMPTY, switchMap, tap } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    NgClass,
    ...sharedImports,
    LoadingScreenComponent
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  isLoading = false;

  public loginData = { username: '', password: '' };

  constructor(
    private snack: MatSnackBar,
    private login: LoginService,
    private router: Router,
    private remind: ReviewReminderService
  ) {}

  ngOnInit(): void {
  }

  formSubmit() {
    const u = this.loginData.username?.trim();
    const p = this.loginData.password?.trim();

    if (!u || !p) {
      this.snack.open('Username and password are required', 'OK', {
        duration: 3000,
        verticalPosition: 'top',
        horizontalPosition: 'right',
      });
      return;
    }

    this.login.generateToken({ username: u, password: p }).pipe(
      withLoading(v => this.isLoading = v),
      tap((data: any) => this.login.loginUser(data.token)),
      switchMap(() => this.login.getCurrentUser()),
      tap((user: any) => {
        this.login.setUser(user);
        const role = this.login.getUserRole();

        if (role === 'ADMIN') {
          this.router.navigate(['/admin-dashboard']);
        } else if (role === 'HEAD') {
          this.router.navigate(['/head-dashboard']);
          this.remind.checkOnEnterDashboard();
        } else if (role === 'TEACHER') {
          this.router.navigate(['/user-dashboard']);
          this.remind.checkOnEnterDashboard();
        } else {
          this.snack.open('Invalid user role', 'OK', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error']});
        }

        this.login.loginStatusSubject.next(true);
      }),
      catchError(err => {
        if (err?.status === 401) {
          this.snack.open('Invalid credentials, please try again', 'OK', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error']});
        } else {
          this.snack.open('Login failed, please try again', 'OK', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error']});
        }
        return EMPTY;
      })
    ).subscribe();
  }

  forgotPassword() {
    this.router.navigate(['/forgot-password']);
  }
}
