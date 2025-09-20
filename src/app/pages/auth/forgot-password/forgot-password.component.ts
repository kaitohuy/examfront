import { Component, Inject, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { DOCUMENT, NgClass } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { sharedImports } from '../../../shared/shared-imports';
import { LoadingScreenComponent } from '../../loading-screen/loading-screen.component';
import { LoginService } from '../../../services/login.service';
import { withLoading } from '../../../shared/with-loading';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [NgClass, ...sharedImports, LoadingScreenComponent],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  isLoading = false;
  email = '';

  constructor(
    private snack: MatSnackBar,
    private auth: LoginService,
    @Inject(DOCUMENT) private doc: Document,
    private r2: Renderer2
  ) {}

  ngOnInit(): void { this.r2.addClass(this.doc.body, 'auth-bg'); }
  ngOnDestroy(): void { this.r2.removeClass(this.doc.body, 'auth-bg'); }

  submit() {
    const e = this.email.trim();
    if (!e) {
      this.snack.open('Vui lòng nhập email', 'OK', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error']});
      return;
    }
    this.auth.forgotPassword(e)
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: () => this.snack.open('Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại.', 'OK', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-success']}),
        error: () => this.snack.open('Có lỗi khi gửi yêu cầu. Thử lại sau.', 'OK', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-success']})
      });
  }
}
