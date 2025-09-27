// src/app/pages/profile/profile.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { sharedImports } from '../../shared/shared-imports';
import { LoginService } from '../../services/login.service';
import { SubjectService } from '../../services/subject.service';
import { UserService } from '../../services/user.service';
import { MatDialog } from '@angular/material/dialog';
import { ResetPasswordDialogComponent } from '../reset-password-dialog/reset-password-dialog.component';
import { Subject } from '../../models/subject';
import { RoleType, UserStored } from '../../models/user-dto';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [...sharedImports],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  private login = inject(LoginService);
  private subjectSvc = inject(SubjectService);
  private userSvc = inject(UserService); // để dành cho mở rộng sau
  private dialog = inject(MatDialog);
  private router = inject(Router);

  user = signal<UserStored | null>(null);
  subjects = signal<Subject[]>([]);
  loadingSubjects = signal<boolean>(false);

  /** ảnh đại diện: ưu tiên u.profile nếu là URL hợp lệ, fallback theo giới tính */
  avatarUrl = computed(() => {
    const u = this.user();
    // ảnh mặc định theo giới tính (dùng đường dẫn tuyệt đối từ /assets)
    const fallback = u?.gender === 'FEMALE'
      ? 'assets/images/female.png' // hoặc .png đúng với file bạn có
      : 'assets/images/male.png';

    const candidate = (u?.profile || '').trim();
    // Nếu BE trả URL đầy đủ (http/https/data), dùng luôn; nếu rỗng thì dùng fallback
    if (!candidate) return fallback;
    if (/^(https?:|data:)/i.test(candidate)) return candidate;

    // Nếu bạn lưu đường dẫn tương đối trong DB, cân nhắc chuẩn hoá ở đây:
    // return baseUrl + candidate; // nếu cần
    return candidate; // còn nếu đã là URL hợp lệ
  });

  // fallback khi ảnh lỗi
  onAvatarError(ev: Event) {
    const u = this.user();
    (ev.target as HTMLImageElement).src =
      u?.gender === 'FEMALE' ? 'assets/images/female.png' : 'assets/images/male.png';
  }

  /** tên khoa đầu tiên lấy từ danh sách môn (nếu có) */
  departmentName = computed(() => {
    const first = this.subjects()[0];
    return first?.department?.name || null;
  });

  ngOnInit(): void {
    const me = this.login.getUser();
    if (me) this.user.set(me);

    this.loadingSubjects.set(true);
    this.subjectSvc.getMySubjects().subscribe({
      next: (list) => this.subjects.set((list ?? []).slice()),
      error: () => this.subjects.set([]),
      complete: () => this.loadingSubjects.set(false),
    });
  }

  get roles(): RoleType[] {
    const u = this.user();
    return (Array.isArray(u?.roles) ? u!.roles : []) as RoleType[];
  }

  trackById = (_: number, s: Subject) => s?.id;

  openResetPassword(): void {
    const u = this.user();
    if (!u?.id) return;
    this.dialog.open(ResetPasswordDialogComponent, {
      width: '420px',
      data: { userId: u.id },
      autoFocus: 'dialog',
    });
  }

  goToEditProfile(): void {
    const role = this.login.getUserRole();
    if (role === 'ADMIN') this.router.navigate(['/admin-dashboard/profile/edit']);
    else if (role === 'HEAD') this.router.navigate(['/head-dashboard/profile/edit']);
    else this.router.navigate(['/user-dashboard/profile/edit']);
  }
}
