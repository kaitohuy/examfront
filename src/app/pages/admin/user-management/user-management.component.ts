import { Component, OnInit, ViewChild, inject, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { sharedImports } from '../../../shared/shared-imports';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { UserService } from '../../../services/user.service';
import { DepartmentService } from '../../../services/department.service';
import { User } from '../../../models/user';
import { UserWithRolesAndDeptDTO } from '../../../models/user-dto';
import { mapDtoToUser } from '../../../utils/mapper';
import { AssignHeadDialogComponent } from '../assign-head.dialog/assign-head.dialog.component';
import { Router } from '@angular/router';
import { AdminStats } from '../../../models/stats';

import { LoadingScreenComponent } from '../../loading-screen/loading-screen.component';
import { withLoading } from '../../../shared/with-loading';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    ...sharedImports,
    MatPaginator,
    MatDialogModule,
    MatSortModule,
    LoadingScreenComponent,
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css'
})
export class UserManagementComponent implements OnInit, AfterViewInit {

  private _userService = inject(UserService);
  private _snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private deptSvc = inject(DepartmentService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private userService = inject(UserService);

  users: User[] = [];
  dataSource = new MatTableDataSource<User>([]);
  searchTerm = '';
  activeFilters: string[] = [];
  totalItems = 0;
  pageSize = 5;

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  statistics: AdminStats = { totalUsers: 0, totalDepartments: 0, totalHeads: 0, totalTeachers: 0 };

  /** Overlay loading */
  isLoading = false;

  ngOnInit() {
    // tải table chính với overlay
    this.loadUsers();

    // thống kê: có thể chạy song song, không nhất thiết bật overlay
    this.userService.getUserStatistics().subscribe(stats => {
      this.statistics.totalUsers = stats.totalUsers;
      this.statistics.totalDepartments = stats.totalDepartments;
      this.statistics.totalTeachers = stats.totalTeachers ?? 0;
      this.statistics.totalHeads = stats.totalHeads ?? 0;
    });
  }

  ngAfterViewInit(): void {
    if (this.sort) {
      this.dataSource.sort = this.sort;
      // Trì hoãn set sort mặc định để tránh NG0100
      Promise.resolve().then(() => {
        if (!this.sort?.active) {
          this.sort!.sort({ id: 'id', start: 'asc', disableClear: false });
          this.cdr.detectChanges();
        }
      });
    }
  }

  private setupDataSource(): void {
    // Search
    this.dataSource.filterPredicate = (data: User, filter: string) => {
      const q = (filter || '').toLowerCase();
      const username = (data.username || '').toLowerCase();
      const email = (data.email || '').toLowerCase();
      const fullName = `${data.lastName || ''} ${data.firstName || ''}`.toLowerCase();
      return username.includes(q) || fullName.includes(q) || email.includes(q);
    };

    // Sort chỉ cho 3 cột: id, teacherCode, FullName
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
    this._userService.getNonAdminUsers()
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: (data: UserWithRolesAndDeptDTO[]) => {
          const mapped = (data ?? []).map(mapDtoToUser);
          this.users = mapped;
          this.dataSource.data = mapped;

          this.totalItems = mapped.length;
          this.setupDataSource();

          // KHÔNG set sort ngay tại đây, mà trì hoãn để tránh NG0100
          Promise.resolve().then(() => {
            if (this.sort && !this.sort.active) {
              this.sort.sort({ id: 'id', start: 'asc', disableClear: false });
              this.cdr.detectChanges();
            }
          });

          this.applyFilters();
        },
        error: () => {
          this._snack.open('Không tải được danh sách người dùng', 'Đóng', { duration: 3000 });
        }
      });
  }

  addUser() {
    if (this.isLoading) return;
    this.router.navigate(['/admin-dashboard/add-user/']);
  }

  editUser(user: User): void {
    if (this.isLoading) return;
    this.router.navigate(['/admin-dashboard/user-management', user.id, 'edit']);
  }

  deleteUser(userId: number): void {
    if (this.isLoading) return;
    import('sweetalert2').then(Swal => {
      Swal.default.fire({
        title: 'Delete User',
        text: 'Are you sure you want to delete this user?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel'
      }).then((result: any) => {
        if (!result.isConfirmed) return;
        this._userService.deleteUser(userId)
          .pipe(withLoading(v => this.isLoading = v))
          .subscribe({
            next: () => {
              Swal.default.fire('Successful', 'This user has been deleted!!!', 'success');
              this.loadUsers();
            },
            error: (error) => {
              Swal.default.fire('Error!', 'Can not delete this user. Please try again', 'error');
              console.error(error);
            }
          });
      });
    });
  }

  /** Reset mật khẩu: demo */
  resetPassword(user: User): void {
    if (this.isLoading) return;
    const newPassword = "12345678";
    this._userService.resetPassword(user.id, newPassword)
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: () => {
          this._snack.open(`Mật khẩu mới của "${user.username}" là: ${newPassword}`, 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-success'] });
        },
        error: () => this._snack.open('Failed to reset password.', 'Close', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error'] })
      });
  }

  openAssignHeadDialog(user: User) {
    if (this.isLoading) return;
    const ref = this.dialog.open(AssignHeadDialogComponent, {
      data: { userId: user.id, userName: `${user.lastName} ${user.firstName}` },
      width: '420px'
    });

    ref.afterClosed().subscribe((result?: { departmentId: number | null }) => {
      if (!result?.departmentId) return;

      const deptId = Number(result.departmentId);
      const nextRoles = Array.from(new Set([...(user.roles || []), 'TEACHER', 'HEAD']));

      // chuỗi thao tác có overlay
      this._userService.updateRoles(Number(user.id), nextRoles)
        .pipe(withLoading(v => this.isLoading = v))
        .subscribe({
          next: () => {
            this.deptSvc.getDepartment(deptId).subscribe({
              next: (dept) => {
                this.deptSvc.updateDepartment(deptId, { ...dept, headUser: { id: Number(user.id) } })
                  .pipe(withLoading(v => this.isLoading = v))
                  .subscribe({
                    next: () => { this._snack.open('Đã gán HEAD thành công', 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-success'] }); this.loadUsers(); },
                    error: () => this._snack.open('Gán HEAD thất bại (update department)', 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error'] })
                  });
              },
              error: () => this._snack.open('Không lấy được thông tin bộ môn', 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error'] })
            });
          },
          error: () => this._snack.open('Cập nhật role thất bại', 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error'] })
        });
    });
  }

  removeHead(user: User) {
    if (this.isLoading) return;
    const nextRoles = (user.roles || []).filter(r => r !== 'HEAD');
    this._userService.updateRoles(Number(user.id), nextRoles)
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: () => { this._snack.open('Đã gỡ HEAD', 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-success'] }); this.loadUsers(); },
        error: () => this._snack.open('Gỡ HEAD thất bại', 'Đóng', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error'] })
      });
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

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;
    this.applyFilters();
  }

  filterBy(type: string): void {
    if (type === 'all') this.activeFilters = [];
    else this.activeFilters = this.activeFilters.includes(type)
      ? this.activeFilters.filter(f => f !== type)
      : [...this.activeFilters, type];
    this.applyFilters();
  }

  clearFilters(): void { this.activeFilters = []; this.searchTerm = ''; this.applyFilters(); }

  public applyFilters(): void {
    let filteredData = [...this.users];

    if (this.activeFilters.length > 0) {
      filteredData = filteredData.filter(user =>
        this.activeFilters.every(filter => {
          switch (filter) {
            case 'teacher': return user.roles.includes('TEACHER');
            case 'head': return user.roles.includes('HEAD');
            case 'active': return user.status === 'ACTIVE';
            case 'inactive': return user.status !== 'ACTIVE';
            default: return true;
          }
        })
      );
    }

    this.dataSource.data = filteredData;
    this.dataSource.filter = this.searchTerm.trim().toLowerCase();

    if (this.paginator) this.paginator.firstPage();
    // KHÔNG gọi sort.sort() trong applyFilters để tránh thay đổi DOM giữa CD cycle
  }

  getFilterLabel(filter: string): string {
    const labels: Record<string, string> = {
      teacher: 'Giảng viên',
      head: 'Trưởng bộ môn',
      active: 'Đang hoạt động',
      inactive: 'Không hoạt động'
    };
    return labels[filter] || filter;
  }
  getFilterClass(filter: string): string {
    const classes: Record<string, string> = {
      teacher: 'bg-primary',
      head: 'bg-info',
      active: 'bg-success',
      inactive: 'bg-warning text-dark'
    };
    return classes[filter] || 'bg-secondary';
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
