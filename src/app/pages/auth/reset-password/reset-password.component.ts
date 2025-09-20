import { Component, Inject, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { DOCUMENT, NgClass } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { sharedImports } from '../../../shared/shared-imports';
import { LoadingScreenComponent } from '../../loading-screen/loading-screen.component';
import { LoginService } from '../../../services/login.service';
import { withLoading } from '../../../shared/with-loading';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, ...sharedImports, LoadingScreenComponent],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  isLoading = false;
  token = '';
  hide1 = true; hide2 = true;

  form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirm:  ['', [Validators.required]],
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private snack: MatSnackBar,
    private auth: LoginService,
    @Inject(DOCUMENT) private doc: Document, private r2: Renderer2
  ) {}

  ngOnInit(): void {
    this.r2.addClass(this.doc.body, 'auth-bg');
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
  }
  ngOnDestroy(): void { this.r2.removeClass(this.doc.body, 'auth-bg'); }

  submit() {
    const p = this.form.value.password?.trim() || '';
    const c = this.form.value.confirm?.trim() || '';
    if (!p || p.length < 6) {
      this.snack.open('Mật khẩu tối thiểu 6 ký tự', 'OK', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error']});; return;
    }
    if (p !== c) {
      this.snack.open('Xác nhận mật khẩu không khớp', 'OK', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error']});; return;
    }
    if (!this.token) {
      this.snack.open('Token không hợp lệ hoặc đã hết hạn', 'OK', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error']}); return;
    }

    this.auth.resetPassword(this.token, p)
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: () => {
          this.snack.open('Đổi mật khẩu thành công. Vui lòng đăng nhập.', 'OK', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-success']});
          this.router.navigate(['/login']);
        },
        error: () => this.snack.open('Token không hợp lệ/hết hạn hoặc có lỗi hệ thống.', 'OK', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error']})
      });
  }
}
