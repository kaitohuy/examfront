import { Component, OnInit, inject } from '@angular/core';
import { DepartmentService } from '../../../services/department.service';
import { sharedImports } from '../../../shared/shared-imports';
import { MatSnackBar } from '@angular/material/snack-bar';
import Swal from 'sweetalert2';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DepartmentUpsertDialogComponent } from '../department-upsert.dialog/department-upsert.dialog.component';

// Loading overlay + operator
import { LoadingScreenComponent } from '../../loading-screen/loading-screen.component';
import { withLoading } from '../../../shared/with-loading';

@Component({
  selector: 'app-view-department',
  standalone: true,
  imports: [
    ...sharedImports,
    MatDialogModule,
    LoadingScreenComponent
  ],
  templateUrl: './view-department.component.html',
  styleUrls: ['./view-department.component.css']
})
export class ViewDepartmentComponent implements OnInit {
  private departmentService = inject(DepartmentService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  departments: any[] = [];
  isLoading = true;
  searchText = '';

  sortField: string = 'id';
  sortDirection: 'asc' | 'desc' = 'asc';
  sortIcons: { [key: string]: string } = {
    'id': 'bi bi-arrow-down-up',
    'name': 'bi bi-arrow-down-up',
    'description': 'bi bi-arrow-down-up',
    'headUser': 'bi bi-arrow-down-up'
  };

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.departmentService.getAllDepartment()
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: (data) => {
          this.departments = data || [];
          // giữ sort hiện tại
          this.applySort();
        },
        error: () => {
          this.showError('Lỗi khi tải danh sách bộ môn');
        }
      });
  }

  /** OPEN: Tạo bộ môn */
  openCreateDialog(): void {
    if (this.isLoading) return;
    const ref = this.dialog.open(DepartmentUpsertDialogComponent, {
      width: '560px',
      data: { mode: 'create', department: null }
    });

    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.createDepartment(payload);
    });
  }

  /** OPEN: Sửa bộ môn */
  openEditDialog(department: any): void {
    if (this.isLoading) return;
    const ref = this.dialog.open(DepartmentUpsertDialogComponent, {
      width: '560px',
      data: { mode: 'edit', department }
    });

    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.updateDepartment(department.id, payload);
    });
  }

  createDepartment(department: any): void {
    this.departmentService.createDepartment(department)
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: (data) => {
          this.departments.push(data);
          this.applySort();
          this.showSuccess('Thêm bộ môn thành công');
        },
        error: () => { this.showError('Lỗi khi thêm bộ môn'); }
      });
  }

  updateDepartment(id: number, department: any): void {
    this.departmentService.updateDepartment(id, department)
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: (data) => {
          const index = this.departments.findIndex(d => d.id === id);
          if (index !== -1) this.departments[index] = data;
          this.applySort();
          this.showSuccess('Cập nhật bộ môn thành công');
        },
        error: () => this.showError('Lỗi khi cập nhật bộ môn')
      });
  }

  deleteDepartment(id: number): void {
    if (this.isLoading) return;
    Swal.fire({
      title: 'Xác nhận xóa',
      text: 'Bạn có chắc chắn muốn xóa bộ môn này?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.departmentService.deleteDepartment(id)
        .pipe(withLoading(v => this.isLoading = v))
        .subscribe({
          next: () => {
            this.departments = this.departments.filter(d => d.id !== id);
            this.showSuccess('Xóa bộ môn thành công');
          },
          error: () => this.showError('Lỗi khi xóa bộ môn')
        });
    });
  }

  // ==== Sort + Filter ====
  sort(field: string): void {
    if (this.isLoading) return; // chặn click khi đang load
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.updateSortIcons();
    this.applySort();
  }

  updateSortIcons(): void {
    Object.keys(this.sortIcons).forEach(key => { this.sortIcons[key] = 'bi bi-arrow-down-up'; });
    if (this.sortField && this.sortDirection) {
      this.sortIcons[this.sortField] = this.sortDirection === 'asc' ? 'bi bi-sort-down' : 'bi bi-sort-up';
    }
  }

  applySort(): void {
    if (!this.sortField) return;
    this.departments.sort((a, b) => {
      let valueA = a[this.sortField];
      let valueB = b[this.sortField];
      if (this.sortField === 'headUser') {
        valueA = valueA ? `${valueA.firstName} ${valueA.lastName}` : '';
        valueB = valueB ? `${valueB.firstName} ${valueB.lastName}` : '';
      }
      if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  get filteredDepartments(): any[] {
    let result = [...this.departments];
    // sort
    if (this.sortField && this.sortDirection) {
      result.sort((a, b) => {
        let valueA = a[this.sortField];
        let valueB = b[this.sortField];
        if (this.sortField === 'headUser') {
          valueA = valueA ? `${valueA.firstName} ${valueA.lastName}` : '';
          valueB = valueB ? `${valueB.firstName} ${valueB.lastName}` : '';
        }
        if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
        if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    // search
    if (this.searchText) {
      const s = this.searchText.toLowerCase();
      result = result.filter(dept =>
        dept.name?.toLowerCase().includes(s) ||
        dept.description?.toLowerCase().includes(s) ||
        (dept.headUser && (
          dept.headUser.firstName?.toLowerCase().includes(s) ||
          dept.headUser.lastName?.toLowerCase().includes(s)
        ))
      );
    }
    return result;
  }

  // ==== Toast helpers ====
  showSuccess(message: string): void {
    this.snackBar.open(message, 'Đóng', {
      duration: 3000,
      verticalPosition: 'top',
      horizontalPosition: 'right',
      panelClass: ['success-snackbar']
    });
  }
  showError(message: string): void {
    this.snackBar.open(message, 'Đóng', {
      duration: 3000,
      verticalPosition: 'top',
      horizontalPosition: 'right',
      panelClass: ['error-snackbar']
    });
  }
}
