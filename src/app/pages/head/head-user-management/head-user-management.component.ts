// src/app/pages/head/head-user-management/head-user-management.component.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { sharedImports } from '../../../shared/shared-imports';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import Swal from 'sweetalert2';

import { UserService } from '../../../services/user.service';
import { DepartmentService } from '../../../services/department.service';
import { User } from '../../../models/user';
import { UserWithRolesAndDeptDTO } from '../../../models/user-dto';
import { mapDtoToUser } from '../../../utils/mapper';

@Component({
  selector: 'app-head-user-management',
  standalone: true,
  imports: [...sharedImports, MatSortModule, MatPaginator],
  templateUrl: '../../admin/user-management/user-management.component.html',   // dùng chung HTML admin
  styleUrls: ['../../admin/user-management/user-management.component.css']     // dùng chung CSS admin
})
export class HeadUserManagementComponent implements OnInit {
  users: User[] = [];
  dataSource = new MatTableDataSource<User>([]);
  searchTerm = '';
  activeFilters: string[] = [];
  pageSize = 5;

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Thống kê cho phạm vi dept của HEAD
  statistics = { totalUsers: 0, activeUsers: 0, lockedUsers: 0, totalTeachers: 0 };

  // HEAD có nút Add User (theo yêu cầu)
  canCreateUser = true;

  private headDepartmentId!: number;

  constructor(
    private userSvc: UserService,
    private deptSvc: DepartmentService,
    private snack: MatSnackBar
  ) { }

  ngOnInit(): void {
    const headUserId = Number(localStorage.getItem('headUserId') || '0');

    // 1) Lấy department của HEAD
    this.deptSvc.getDepartmentsByHead(headUserId).subscribe({
      next: (depts) => {
        if (!depts?.length) return;
        this.headDepartmentId = depts[0].id;

        // 2) Lấy users toàn hệ thống (có department trong DTO) -> lọc theo dept
        this.loadUsers();
      },
      error: () => {
        this.snack.open('Không lấy được department của HEAD', 'Đóng', { duration: 3000 });
      }
    });
  }

  ngAfterViewInit(): void {
    this.setupDataSource();
  }

  private setupDataSource(): void {
    // Filter theo username / fullName / email
    this.dataSource.filterPredicate = (data: User, filter: string) => {
      const q = (filter || '').toLowerCase();
      const username = (data.username || '').toLowerCase();
      const email = (data.email || '').toLowerCase();
      const fullName = `${data.lastName || ''} ${data.firstName || ''}`.toLowerCase();

      return username.includes(q) || fullName.includes(q) || email.includes(q);
    };

    // Sort theo các cột (id header khớp HTML admin)
    this.dataSource.sortingDataAccessor = (data: User, sortHeaderId: string) => {
      switch (sortHeaderId) {
        case 'FullName': return `${data.lastName || ''} ${data.firstName || ''}`.toLowerCase();
        case 'id': return data.id ?? 0;
        case 'studentCode': return data.studentCode ?? '';
        case 'username': return data.username ?? '';
        case 'email': return data.email ?? '';
        case 'phone': return data.phone ?? '';
        case 'status': return data.status ?? '';
        case 'roles': return (data.roles || []).join(', ');
        case 'enabled': return data.enabled ? 1 : 0;
        default: return (data as any)?.[sortHeaderId];
      }
    };

    if (this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort) this.dataSource.sort = this.sort;
  }

  loadUsers(): void {
    this.userSvc.getAllUsers().subscribe({
      next: (all: UserWithRolesAndDeptDTO[]) => {
        const ofMyDept = (all ?? []).filter(u => u.department?.id === this.headDepartmentId);
        this.users = ofMyDept.map(mapDtoToUser);    // map DTO -> User
        this.dataSource.data = this.users;
        this.applyFilters();
      },
      error: () => this.snack.open('Lỗi tải người dùng', 'Đóng', { duration: 3000 })
    });
  }

  // ================== Actions giống admin ==================
  deleteUser(userId: number): void {
    Swal.fire({
      title: 'Delete User',
      text: 'Are you sure you want to delete this user?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.userSvc.deleteUser(userId).subscribe({
        next: () => {
          Swal.fire('Successful', 'This user has been deleted!!!', 'success');
          this.loadUsers();
        },
        error: () => Swal.fire('Error!', 'Can not delete this user. Please try again', 'error')
      });
    });
  }

  toggleEnabled(user: User): void {
    const newStatus = !user.enabled;
    this.userSvc.toggleEnabled(user.id, newStatus).subscribe({
      next: () => {
        user.enabled = newStatus;
        this.snack.open(`User status updated to ${newStatus ? 'enabled' : 'disabled'}.`, 'Close', { duration: 3000 });
        this.loadUsers();
      },
      error: () => Swal.fire('Error', 'Failed to update user status.', 'error')
    });
  }

  resetPassword(userId: number, newPassword: string): void {
    this.userSvc.resetPassword(userId, newPassword).subscribe({
      next: () => this.snack.open('Password reset successfully!', 'Close', { duration: 3000 }),
      error: () => Swal.fire('Error', 'Failed to reset password.', 'error')
    });
  }

  updateRole(userId: number, roles: string[]): void {
    this.userSvc.updateRoles(userId, roles).subscribe({
      next: () => {
        this.snack.open('Role assigned successfully!', 'Close', { duration: 3000 });
        this.loadUsers();
      },
      error: () => Swal.fire('Error', 'Failed to assign role.', 'error')
    });
  }

  exportToCSV(): void {
    const list = this.dataSource.filteredData?.length
      ? this.dataSource.filteredData
      : this.users;

    const headers = ['ID', 'Code User', 'Username', 'Email', 'Phone', 'Full Name', 'Roles', 'Status', 'Enabled'];
    const rows = list.map(u => [
      u.id,
      u.studentCode ?? '',
      u.username ?? '',
      u.email ?? '',
      u.phone ?? '',
      `${u.lastName ?? ''} ${u.firstName ?? ''}`.trim(),
      (u.roles ?? []).join('; '),
      u.status ?? '',
      u.enabled ? 'true' : 'false',
    ]);

    let csv = '\uFEFF' + headers.join(',') + '\n';
    rows.forEach(r => {
      csv += r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'users.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // ================== Filter/Sort helpers (khớp HTML admin) ==================
  onSearch(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value || '';
    this.applyFilters();
  }

  filterBy(type: string): void {
    if (type === 'all') {
      this.activeFilters = [];
    } else {
      this.activeFilters = this.activeFilters.includes(type)
        ? this.activeFilters.filter(x => x !== type)
        : [...this.activeFilters, type];
    }
    this.applyFilters();
  }

  clearFilters(): void {
    this.activeFilters = [];
    this.searchTerm = '';
    this.applyFilters();
  }

  sortBy(type: string): void {
    if (!this.sort) return;
    switch (type) {
      case 'newest': this.sort.sort({ id: 'id', start: 'desc', disableClear: false }); break;
      case 'oldest': this.sort.sort({ id: 'id', start: 'asc', disableClear: false }); break;
      case 'a-z': this.sort.sort({ id: 'FullName', start: 'asc', disableClear: false }); break;
      case 'z-a': this.sort.sort({ id: 'FullName', start: 'desc', disableClear: false }); break;
    }
  }

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

    // Thống kê theo danh sách sau filter + search
    const list = this.dataSource.filteredData;
    this.statistics.totalUsers = list.length;
    this.statistics.activeUsers = list.filter(u => u.status === 'ACTIVE').length;
    this.statistics.lockedUsers = list.filter(u => u.status === 'LOCKED').length;
    this.statistics.totalTeachers = list.filter(u => u.roles?.includes('TEACHER')).length;
  }

  getStatusBadge(s: string) {
    switch (s) {
      case 'ACTIVE': return 'status-active';
      case 'INACTIVE': return 'status-inactive';
      case 'LOCKED': return 'status-locked';
      default: return 'status-unknown';
    }
  }

  getFilterLabel(filter: string): string {
    const labels: Record<string, string> = {
      teacher: 'Giảng viên',
      head: 'Trưởng bộ môn',
      active: 'Đang hoạt động',
      inactive: 'Không hoạt động',
      all: 'Tất cả',
    };
    return labels[filter] ?? filter;
  }

  getFilterClass(filter: string): string {
    const classes: Record<string, string> = {
      teacher: 'bg-primary',
      head: 'bg-info',
      active: 'bg-success',
      inactive: 'bg-warning text-dark',
    };
    return classes[filter] ?? 'bg-secondary';
  }

}
