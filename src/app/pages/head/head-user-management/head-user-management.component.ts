// src/app/pages/head/user-management/head-user-management.component.ts
import { Component, OnInit, ViewChild, inject, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { sharedImports } from '../../../shared/shared-imports';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSort, MatSortModule } from '@angular/material/sort';
import Swal from 'sweetalert2';

import { UserService } from '../../../services/user.service';
import { DepartmentService } from '../../../services/department.service';
import { User } from '../../../models/user';
import { UserWithRolesAndDeptDTO } from '../../../models/user-dto';
import { mapDtoToUser } from '../../../utils/mapper';
import { Router } from '@angular/router';
import { LoginService } from '../../../services/login.service';
import { HeadDeptStats } from '../../../models/stats';
import { LoadingScreenComponent } from '../../loading-screen/loading-screen.component';
import { withLoading } from '../../../shared/with-loading';

@Component({
  selector: 'app-head-user-management',
  standalone: true,
  imports: [...sharedImports, MatPaginator, MatDialogModule, MatSortModule, LoadingScreenComponent],
  templateUrl: './head-user-management.component.html',
  styleUrls: ['../../admin/user-management/user-management.component.css']
})
export class HeadUserManagementComponent implements OnInit, AfterViewInit {
  users: User[] = [];
  dataSource = new MatTableDataSource<User>([]);
  searchTerm = '';
  activeFilters: string[] = [];
  pageSize = 5;
  isLoading = false;

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  statistics: HeadDeptStats = { subjectCount: 0, teacherCount: 0, unassignedSubjectCount: 0 };

  private userSvc = inject(UserService);
  private deptSvc = inject(DepartmentService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private login = inject(LoginService);

  private headDepartmentId!: number;

  ngOnInit(): void {
    const headUserId =
      this.login.getUserId() ?? this.login.getUser()?.id ?? Number(localStorage.getItem('headUserId') || '0');

    this.deptSvc.getDepartmentsByHead(headUserId)
      .pipe(withLoading(v => (this.isLoading = v)))
      .subscribe({
        next: (depts) => {
          if (!depts?.length) {
            this.snack.open('Bạn chưa được gán HEAD bộ môn nào', 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error'] });
            return;
          }
          this.headDepartmentId = depts[0].id;
          this.loadHeadStats();
          this.loadUsers();
        },
        error: () => this.snack.open('Không lấy được department của HEAD', 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error'] })
      });
  }

  private loadHeadStats() {
    this.deptSvc.getDepartmentStats(this.headDepartmentId)
      .pipe(withLoading(v => (this.isLoading = v)))
      .subscribe((s) => {
        this.statistics.subjectCount = s.subjectCount;
        this.statistics.teacherCount = s.teacherCount;
        this.statistics.unassignedSubjectCount = s.unassignedSubjectCount ?? 0;
      });
  }

  ngAfterViewInit(): void {
    if (this.sort) {
      this.dataSource.sort = this.sort;
      Promise.resolve().then(() => {
        if (!this.sort?.active) {
          this.sort!.sort({ id: 'id', start: 'asc', disableClear: false });
          this.cdr.detectChanges();
        }
      });
    }
  }

  private setupDataSource() {
    // Search
    this.dataSource.filterPredicate = (data: User, filter: string) => {
      const q = (filter || '').toLowerCase();
      const username = (data.username || '').toLowerCase();
      const email = (data.email || '').toLowerCase();
      const fullName = `${data.lastName || ''} ${data.firstName || ''}`.toLowerCase();
      return username.includes(q) || fullName.includes(q) || email.includes(q);
    };

    // Sort
    this.dataSource.sortingDataAccessor = (data: User, sortHeaderId: string) => {
      switch (sortHeaderId) {
        case 'id': return Number(data.id) || 0;
        case 'teacherCode': return (data.teacherCode || '').toLowerCase();
        case 'FullName': return `${data.lastName || ''} ${data.firstName || ''}`.toLowerCase();
        default: return (data as any)?.[sortHeaderId];
      }
    };

    if (this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort) this.dataSource.sort = this.sort;
  }

  loadUsers(): void {
    this.userSvc.getAllUsers()
      .pipe(withLoading(v => (this.isLoading = v)))
      .subscribe({
        next: (all: UserWithRolesAndDeptDTO[]) => {
          const list = (all ?? [])
            .filter(u => u.department?.id === this.headDepartmentId)
            .map(mapDtoToUser);

          this.users = list;
          this.dataSource.data = list;

          this.setupDataSource();

          // trì hoãn sort mặc định để tránh NG0100
          Promise.resolve().then(() => {
            if (this.sort && !this.sort.active) {
              this.sort.sort({ id: 'id', start: 'asc', disableClear: false });
              this.cdr.detectChanges();
            }
          });

          this.applyFilters();
        },
        error: () => this.snack.open('Lỗi tải người dùng', 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error'] })
      });
  }

  addUser() {
    this.router.navigate(['/head-dashboard/add-user/']);
  }

  editUser(user: User): void {
    this.router.navigate(['/head-dashboard/user-management', user.id, 'edit']);
  }

  deleteUser(userId: number): void {
    Swal.fire({
      title: 'Delete User',
      text: 'Are you sure you want to delete this user?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.userSvc.deleteUser(userId)
        .pipe(withLoading(v => (this.isLoading = v)))
        .subscribe({
          next: () => { Swal.fire('Successful', 'This user has been deleted!!!', 'success'); this.loadUsers(); },
          error: () => Swal.fire('Error!', 'Can not delete this user. Please try again', 'error')
        });
    });
  }

  resetPassword(user: User): void {
    const newPassword = '123abc';
    this.userSvc.resetPassword(user.id, newPassword)
      .pipe(withLoading(v => (this.isLoading = v)))
      .subscribe({
        next: () => this.snack.open(`Mật khẩu mới của "${user.username}" là: ${newPassword}`, 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-success'] }),
        error: () => this.snack.open('Failed to reset password.', 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error'] })
      });
  }

  onSearch(e: Event) { this.searchTerm = (e.target as HTMLInputElement).value || ''; this.applyFilters(); }

  filterBy(type: string): void {
    this.activeFilters = type === 'all'
      ? []
      : this.activeFilters.includes(type)
        ? this.activeFilters.filter(x => x !== type)
        : [...this.activeFilters, type];
    this.applyFilters();
  }

  clearFilters(): void { this.activeFilters = []; this.searchTerm = ''; this.applyFilters(); }

  applyFilters(): void {
    let filtered = [...this.users];

    if (this.activeFilters.length > 0) {
      filtered = filtered.filter(u =>
        this.activeFilters.every(f => {
          switch (f) {
            case 'teacher': return u.roles?.includes('TEACHER');
            case 'head': return u.roles?.includes('HEAD');
            case 'active': return u.status === 'ACTIVE';
            case 'inactive': return u.status !== 'ACTIVE';
            default: return true;
          }
        })
      );
    }

    this.dataSource.data = filtered;
    this.dataSource.filter = this.searchTerm.trim().toLowerCase();

    if (this.paginator) this.paginator.firstPage();
  }

  getFilterLabel(f: string) {
    const m: Record<string, string> = {
      teacher: 'Giảng viên',
      head: 'Trưởng bộ môn',
      active: 'Đang hoạt động',
      inactive: 'Không hoạt động',
      all: 'Tất cả'
    };
    return m[f] ?? f;
  }

  getFilterClass(f: string) {
    const m: Record<string, string> = {
      teacher: 'bg-primary',
      head: 'bg-info',
      active: 'bg-success',
      inactive: 'bg-warning text-dark'
    };
    return m[f] ?? 'bg-secondary';
  }

  exportToCSV(): void {
    if (this.isLoading) return;
    const headers = ['ID', 'Code User', 'Username', 'Email', 'Phone', 'Full Name', 'Roles'];
    const rows = this.users.map(u => [
      u.id, u.teacherCode, u.username, u.email, u.phone,
      `${u.lastName} ${u.firstName}`, u.roles.join('; ')
    ]);

    let csvContent = '\uFEFF' + headers.join(',') + '\n';
    rows.forEach(row => { csvContent += row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',') + '\n'; });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url); link.setAttribute('download', 'users.csv'); link.click();
    URL.revokeObjectURL(url);
  }

  getPrimaryRole(u: User): string {
    const roles = (u.roles || []).map(r => String(r).toUpperCase());
    if (roles.includes('ADMIN')) return 'ADMIN';
    if (roles.includes('HEAD')) return 'HEAD';
    if (roles.includes('TEACHER')) return 'TEACHER';
    // fallback: nếu BE có role khác hoặc trống
    return roles[0] || 'TEACHER';
  }

  getRoleBadgeClass(u: User): string {
    const r = this.getPrimaryRole(u).toLowerCase();
    return `badge-${r}`;
  }
}
