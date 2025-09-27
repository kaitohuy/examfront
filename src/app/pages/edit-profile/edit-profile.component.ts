import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';

import { sharedImports } from '../../shared/shared-imports';
import { LoginService } from '../../services/login.service';
import { UserStored } from '../../models/user-dto';
import { UserService } from '../../services/user.service';
import { VN_DATE_FORMATS } from '../../models/dateFormats';

import { withLoading } from '../../shared/with-loading';
import { LoadingScreenComponent } from '../loading-screen/loading-screen.component';

type Role = 'ADMIN' | 'HEAD' | 'TEACHER' | null;

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' },
    { provide: MAT_DATE_FORMATS, useValue: VN_DATE_FORMATS },
  ],
  imports: [...sharedImports, ReactiveFormsModule, LoadingScreenComponent],
  templateUrl: './edit-profile.component.html',
  styleUrl: './edit-profile.component.css',
})
export class EditProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private login = inject(LoginService);
  private userSvc = inject(UserService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  /** chặn/bắt sự kiện lăn chuột trên datepicker */
  private wheelHandler?: (e: WheelEvent) => void;

  /** Loading flag cho overlay */
  isLoading = false;

  /** vai trò hiện tại của người đang đăng nhập */
  role: Role = null;
  /** user đang hiển thị trên form (có thể là chính mình, hoặc user khác khi có :id) */
  user!: UserStored;

  /** có param id hay không (admin/head vào từ user-management) */
  private get editingOtherUser(): boolean {
    return !!this.route.snapshot.paramMap.get('id');
  }

  form = this.fb.group({
    id: [null as number | null, Validators.required],
    teacherCode: [''],
    lastName: ['', Validators.required],
    firstName: ['', Validators.required],
    email: ['', Validators.email],
    phone: [''],
    gender: [''],
    /** Dùng Date cho MatDatepicker */
    birthDate: [null as Date | null],
    profile: [''],
  });

  /** Parse string -> Date (hỗ trợ 'YYYY-MM-DD' hoặc ISO) */
  private parseToDate(v: any): Date | null {
    if (!v) return null;
    if (typeof v === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const [y, m, d] = v.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        return Number.isNaN(dt.getTime()) ? null : dt;
      }
      const dt = new Date(v);
      return Number.isNaN(dt.getTime()) ? null : dt;
    }
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
    return null;
  }

  /** Convert Date -> 'YYYY-MM-DD' cho BE (LocalDate) */
  private toYMD(d: Date | null | undefined): string | null {
    if (!d) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  ngOnInit(): void {
    this.role = this.login.getUserRole();
    const paramId = this.route.snapshot.paramMap.get('id');

    if (paramId) {
      // Admin/Head đang chỉnh user khác
      const id = Number(paramId);
      this.userSvc.getUserById(id)
        .pipe(withLoading(v => this.isLoading = v))
        .subscribe({
          next: (u: any) => this.patchFormFrom(u),
          error: () => {
            this.snack.open('Không tải được người dùng', 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error']});
            this.navigateBackList();
          },
        });
    } else {
      // Người dùng tự sửa profile
      const u = this.login.getUser();
      if (u) this.patchFormFrom(u);
    }
  }

  /** Đổ dữ liệu vào form */
  private patchFormFrom(u: any) {
    this.user = u;
    this.form.patchValue({
      id: u.id,
      teacherCode: u.teacherCode ?? '',
      lastName: u.lastName ?? '',
      firstName: u.firstName ?? '',
      email: u.email ?? '',
      phone: u.phone ?? '',
      gender: u.gender ?? '',
      birthDate: this.parseToDate(u.birthDate),
      profile: u.profile ?? '',
    });
  }

  get avatarPreview(): string {
    const val = this.form.get('profile')?.value;
    const url = (typeof val === 'string' ? val.trim() : '') || '';
    const g = this.form.get('gender')?.value;
    return g === 'FEMALE' ? 'assets/images/female.png' : 'assets/images/male.png';
  }

  /** Hủy: quay về nơi gọi */
  cancel(): void {
    if (this.editingOtherUser) {
      this.navigateBackList();
    } else {
      this.goBackToProfileByRole();
    }
  }

  /** Trở về màn hồ sơ theo role (khi tự sửa) */
  private goBackToProfileByRole(): void {
    const role = this.role;
    if (role === 'ADMIN') this.router.navigate(['/admin-dashboard/profile']);
    else if (role === 'HEAD') this.router.navigate(['/head-dashboard/profile']);
    else this.router.navigate(['/user-dashboard/profile']);
  }

  /** Trở về danh sách user-management theo role dashboard (khi sửa user khác) */
  private navigateBackList(): void {
    if (this.role === 'HEAD') this.router.navigate(['/head-dashboard/user-management']);
    else this.router.navigate(['/admin-dashboard/user-management']);
  }

  // ======= Datepicker mouse wheel support =======
  onDatepickerOpened() {
    setTimeout(() => {
      const panel = document.querySelector('.mat-datepicker-content, .mat-calendar') as HTMLElement | null;
      const prevBtn = document.querySelector('.mat-calendar-previous-button') as HTMLButtonElement | null;
      const nextBtn = document.querySelector('.mat-calendar-next-button') as HTMLButtonElement | null;
      if (!panel || !prevBtn || !nextBtn) return;

      this.wheelHandler = (e: WheelEvent) => {
        e.preventDefault();
        const goNext = e.deltaY > 0;
        (goNext ? nextBtn : prevBtn).click();
      };
      panel.addEventListener('wheel', this.wheelHandler, { passive: false });
    });
  }
  onDatepickerClosed() {
    const panel = document.querySelector('.mat-datepicker-content, .mat-calendar') as HTMLElement | null;
    if (panel && this.wheelHandler) {
      panel.removeEventListener('wheel', this.wheelHandler as EventListener);
      this.wheelHandler = undefined;
    }
  }

  submit(): void {
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const payload = {
      ...raw,
      birthDate: this.toYMD(raw.birthDate),
    };

    this.userSvc.update(payload as any)
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: (res: any) => {
          // nếu là tự sửa -> cập nhật lại local user
          if (!this.editingOtherUser) {
            const merged = {
              ...this.user,
              ...res,
              roles: Array.isArray(res?.roles) ? res.roles : this.user.roles,
              department: res?.department ?? this.user.department,
              birthDate: res?.birthDate ?? this.user.birthDate,
            };
            this.login.setUser(merged);
          }
          this.snack.open('Cập nhật hồ sơ thành công', 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-success']});
          if (this.editingOtherUser) this.navigateBackList();
          else this.goBackToProfileByRole();
        },
        error: (err) => {
          console.error('update error', err);
          this.snack.open('Cập nhật thất bại', 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error']});
        },
      });
  }
}
