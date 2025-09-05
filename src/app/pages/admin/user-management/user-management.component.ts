import { Component, OnInit, ViewChild } from '@angular/core';
import { sharedImports } from '../../../shared/shared-imports';
import { Sort, MatSortModule, MatSort, SortDirection } from '@angular/material/sort';
import Swal from 'sweetalert2';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../../services/user.service';
import { User } from '../../../models/user';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { UserWithRolesAndDeptDTO } from '../../../models/user-dto';
import { mapDtoToUser } from '../../../utils/mapper';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    ...sharedImports,
    MatSortModule,
    MatPaginator,
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css'
})
export class UserManagementComponent implements OnInit {

  users: User[] = [];
  dataSource = new MatTableDataSource<User>([]);
  searchTerm: string = '';
  activeFilters: string[] = [];
  totalItems: number = 142;
  pageSize: number = 5;


  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  statistics = {
    totalUsers: 0,
    activeUsers: 0,
    lockedUsers: 0,
    totalTeachers: 0
  };

  constructor(private _userService: UserService, private _snack: MatSnackBar) { }

  ngOnInit(): void {
    this.loadUsers();
    this._userService.getUserStatistics().subscribe({
      next: (data: any) => {
        this.statistics = data;
        this.totalItems = data.totalUsers;
      },
      error: (error: any) => {
        console.error(error);
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

    // Sort theo các cột; chú ý id trong template phải trùng các case bên dưới
    this.dataSource.sortingDataAccessor = (data: User, sortHeaderId: string) => {
      switch (sortHeaderId) {
        case 'FullName':
          // để dễ so sánh, hạ về lowercase
          return `${data.lastName || ''} ${data.firstName || ''}`.toLowerCase();

        case 'id':
          return data.id ?? 0;

        case 'studentCode':
          return data.studentCode ?? '';

        case 'username':
          return data.username ?? '';

        case 'email':
          return data.email ?? '';

        case 'phone':
          return data.phone ?? '';

        case 'status':
          return data.status ?? '';

        case 'roles':
          return (data.roles || []).join(', ');

        case 'enabled':
          // MatSort sẽ coi number tốt hơn boolean
          return data.enabled ? 1 : 0;

        default:
          // fallback nếu có thêm cột tuỳ biến
          return (data as any)?.[sortHeaderId];
      }
    };

    // Gắn paginator/sort
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  loadUsers(): void {
    this._userService.getAllUsers().subscribe({
      next: (data: UserWithRolesAndDeptDTO[]) => {
        this.users = (data ?? []).map(mapDtoToUser);
        this.dataSource.data = this.users;
        this.applyFilters();
      }
    });
  }

  deleteUser(userId: number): void {
    Swal.fire({
      title: 'Delete User',
      text: 'Are you sure you want to delete this user?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this._userService.deleteUser(userId).subscribe({
          next: () => {
            Swal.fire('Successful', 'This user has been deleted!!!', 'success');
            this.loadUsers();
          },
          error: (error) => {
            Swal.fire('Error!', 'Can not delete this user. Please try again', 'error');
            console.error('Error deleting user:', error);
          }
        });
      }
    });
  }

  toggleEnabled(user: any): void {
    const newStatus = !user.enabled;
    this._userService.toggleEnabled(user.id, newStatus).subscribe({
      next: () => {
        user.enabled = newStatus;
        this._snack.open(`User status updated to ${newStatus ? 'enabled' : 'disabled'}.`, 'Close', {
          duration: 3000,
          verticalPosition: 'top',
          horizontalPosition: 'right'
        });
        this.loadUsers();
      },
      error: (error) => {
        Swal.fire('Error', 'Failed to update user status.', 'error');
        console.error('Error toggling user status:', error);
      }
    });
  }

  resetPassword(userId: number, newPassword: string): void {
    this._userService.resetPassword(userId, newPassword).subscribe({
      next: () => {
        this._snack.open('Password reset successfully!', 'Close', {
          duration: 3000,
          verticalPosition: 'top',
          horizontalPosition: 'right'
        });
      },
      error: (error) => {
        Swal.fire('Error', 'Failed to reset password.', 'error');
        console.error('Error resetting password:', error);
      }
    });
  }

  updateRole(userId: number, roles: string[]): void {
    this._userService.updateRoles(userId, roles).subscribe({
      next: () => {
        this._snack.open(`Role assigned successfully!`, 'Close', {
          duration: 3000,
          verticalPosition: 'top',
          horizontalPosition: 'right'
        });
        this.loadUsers(); // Refresh the user list to reflect role changes
      },
      error: (error) => {
        Swal.fire('Error', 'Failed to assign role.', 'error');
        console.error('Error assigning role:', error);
      }
    });
  }

  getStatusBadge(arg0: any): string {
    switch (arg0) {
      case 'ACTIVE':
        return 'status-active';
      case 'INACTIVE':
        return 'status-inactive';
      case 'LOCKED':
        return 'status-locked';
      default:
        return 'status-unknown';
    }
  }

  exportToCSV(): void {
    const headers = ['ID', 'Code User', 'Username', 'Email', 'Full Name', 'Roles', 'Status'];
    const rows = this.users.map(user => [
      user.id,
      user.studentCode,
      user.username,
      user.email,
      user.phone,
      `${user.lastName} ${user.firstName}`,
      user.roles.join('; '),
    ]);

    let csvContent = '\uFEFF';
    csvContent += headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'users.csv');
    link.click();
    URL.revokeObjectURL(url);
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;
    this.applyFilters();
  }

  filterBy(type: string): void {
    if (type === 'all') {
      this.activeFilters = [];
    } else {
      if (this.activeFilters.includes(type)) {
        this.activeFilters = this.activeFilters.filter(f => f !== type);
      } else {
        this.activeFilters.push(type);
      }
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
      case 'newest':
        this.sort.sort({ id: 'id', start: 'desc', disableClear: false });
        break;
      case 'oldest':
        this.sort.sort({ id: 'id', start: 'asc', disableClear: false });
        break;
      case 'a-z':
        this.sort.sort({ id: 'FullName', start: 'asc', disableClear: false });
        break;
      case 'z-a':
        this.sort.sort({ id: 'FullName', start: 'desc', disableClear: false });
        break;
    }
  }

  // Simplified filter application - let MatTableDataSource handle the heavy lifting
  public applyFilters(): void {
    let filteredData = [...this.users];

    // Apply role and status filters
    if (this.activeFilters.length > 0) {
      filteredData = filteredData.filter(user => {
        return this.activeFilters.every(filter => {
          switch (filter) {
            case 'teacher':
              return user.roles.includes('TEACHER');
            case 'head':
              return user.roles.includes('HEAD');
            case 'active':
              return user.status === 'ACTIVE';
            case 'inactive':
              return user.status !== 'ACTIVE';
            default:
              return true;
          }
        });
      });
    }

    // Update dataSource with filtered data
    this.dataSource.data = filteredData;

    // Apply search filter using MatTableDataSource's built-in filtering
    this.dataSource.filter = this.searchTerm.trim().toLowerCase();

    // Reset pagination to first page when filters change
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  getFilterLabel(filter: string): string {
    const labels: { [key: string]: string } = {
      'teacher': 'Giảng viên',
      'head': 'Trưởng bộ môn',
      'active': 'Đang hoạt động',
      'inactive': 'Không hoạt động'
    };
    return labels[filter] || filter;
  }

  getFilterClass(filter: string): string {
    const classes: { [key: string]: string } = {
      'teacher': 'bg-primary',
      'head': 'bg-info',
      'active': 'bg-success',
      'inactive': 'bg-warning text-dark'
    };
    return classes[filter] || 'bg-secondary';
  }
}