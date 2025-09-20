import { Component, inject, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { sharedImports } from '../../shared/shared-imports';
import { UserService } from '../../services/user.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-reset-password-dialog',
  standalone: true,
  imports: [MatDialogModule, ReactiveFormsModule, ...sharedImports],
  templateUrl: './reset-password-dialog.component.html',
})
export class ResetPasswordDialogComponent {
  private fb = inject(FormBuilder);
  private userSvc = inject(UserService);
  private snack = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<ResetPasswordDialogComponent>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: { userId: number }) {}

  form = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(3)]],
    confirm: ['', [Validators.required]],
  });

  get invalidConfirm(): boolean {
    const { newPassword, confirm } = this.form.value;
    return !!newPassword && !!confirm && newPassword !== confirm;
  }

  submit(): void {
    if (this.form.invalid || this.invalidConfirm) return;
    const pwd = String(this.form.value.newPassword);
    this.userSvc.resetPassword(this.data.userId, pwd).subscribe({
      next: () => {
        this.snack.open('Đã đổi mật khẩu', 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-success']});
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error(err);
        this.snack.open('Đổi mật khẩu thất bại', 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error']});
      },
    });
  }
}
