  import { Component, OnInit } from '@angular/core';
  import { DepartmentService } from '../../../services/department.service';
  import { sharedImports } from '../../../shared/shared-imports';
  import { MatSnackBar } from '@angular/material/snack-bar';
  import Swal from 'sweetalert2';
  import { Department } from '../../../models/department';

  @Component({
    selector: 'app-view-department',
    standalone: true,
    imports: [
      ...sharedImports
    ],
    templateUrl: './view-department.component.html',
    styleUrls: ['./view-department.component.css']
  })

  export class ViewDepartmentComponent implements OnInit {
    departments: any[] = [];
    isLoading = true;
    searchText = '';

    // Biến cho chức năng sắp xếp

    sortField: string = 'id';
    sortDirection: 'asc' | 'desc' = 'asc';
    sortIcons: { [key: string]: string } = {
      'id': 'bi bi-arrow-down-up',
      'name': 'bi bi-arrow-down-up',
      'description': 'bi bi-arrow-down-up',
      'headUser': 'bi bi-arrow-down-up'
    };

    constructor(
      private departmentService: DepartmentService,
      private snackBar: MatSnackBar
    ) { }

    ngOnInit(): void {
      this.loadDepartments();
    }

    loadDepartments(): void {
      this.isLoading = true;
      this.departmentService.getAllDepartment().subscribe({
        next: (data) => {
          this.departments = data;
          this.isLoading = false;
        },
        error: (err) => {
          this.showError('Lỗi khi tải danh sách bộ môn');
          this.isLoading = false;
        }
      });
    }

    openCreateDialog(): void {
      Swal.fire({
        title: 'Thêm bộ môn mới',
        html: `
          <div class="swal-form">
            <div class="mb-3">
              <label for="name" class="form-label">Tên bộ môn</label>
              <input type="text" id="name" class="swal2-input" placeholder="Nhập tên bộ môn" required>
            </div>
            <div class="mb-3">
              <label for="description" class="form-label">Mô tả</label>
              <textarea id="description" class="swal2-textarea" placeholder="Nhập mô tả"></textarea>
            </div>
            <div class="mb-3">
              <label for="headUserId" class="form-label">ID Trưởng bộ môn</label>
              <input type="number" id="headUserId" class="swal2-input" placeholder="Nhập ID người dùng">
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Thêm',
        cancelButtonText: 'Hủy',
        preConfirm: () => {
          const name = (document.getElementById('name') as HTMLInputElement).value;
          const description = (document.getElementById('description') as HTMLTextAreaElement).value;
          const headUserId = (document.getElementById('headUserId') as HTMLInputElement).value;
          console.log(name + " " ,description + " " + headUserId);
          if (!name) {
            Swal.showValidationMessage('Tên bộ môn là bắt buộc');
            return false;
          }
          
          return {
            name,
            description,
            headUser: headUserId
              ? { id: parseInt(headUserId, 10)}
              : null
          } as Department;
        }
      }).then((result) => {
        if (result.isConfirmed && result.value) {
          this.createDepartment(result.value);
        }
      });
    }

    createDepartment(department: any): void {
      this.departmentService.createDepartment(department).subscribe({
        next: (data) => {
          this.departments.push(data);
          this.showSuccess('Thêm bộ môn thành công');
        },
        error: () => {
          this.showError('Lỗi khi thêm bộ môn');
        }
      });
    }

    openEditDialog(department: any): void {
      Swal.fire({
        title: 'Cập nhật bộ môn',
        html: `
          <div class="swal-form">
            <div class="mb-3">
              <label for="name" class="form-label">Tên bộ môn</label>
              <input type="text" id="name" class="swal2-input" value="${department.name}" required>
            </div>
            <div class="mb-3">
              <label for="description" class="form-label">Mô tả</label>
              <textarea id="description" class="swal2-textarea">${department.description || ''}</textarea>
            </div>
            <div class="mb-3">
              <label for="headUserId" class="form-label">ID Trưởng bộ môn</label>
              <input type="number" id="headUserId" class="swal2-input" value="${department.headUser?.id || ''}">
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Cập nhật',
        cancelButtonText: 'Hủy',
        preConfirm: () => {
          const name = (document.getElementById('name') as HTMLInputElement).value;
          const description = (document.getElementById('description') as HTMLTextAreaElement).value;
          const headUserId = (document.getElementById('headUserId') as HTMLInputElement).value;
          
          if (!name) {
            Swal.showValidationMessage('Tên bộ môn là bắt buộc');
            return false;
          }
          
          return {
            name,
            description,
            headUser: headUserId
              ? { id: parseInt(headUserId, 10) }
              : null
          } as Department;
        }
      }).then((result) => {
        if (result.isConfirmed && result.value) {
          this.updateDepartment(department.id, result.value);
        }
      });
    }

    updateDepartment(id: number, department: any): void {
      this.departmentService.updateDepartment(id, department).subscribe({
        next: (data) => {
          const index = this.departments.findIndex(d => d.id === id);
          if (index !== -1) {
            this.departments[index] = data;
          }
          this.showSuccess('Cập nhật bộ môn thành công');
        },
        error: () => {
          this.showError('Lỗi khi cập nhật bộ môn');
        }
      });
    }

    deleteDepartment(id: number): void {
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
        if (result.isConfirmed) {
          this.departmentService.deleteDepartment(id).subscribe({
            next: () => {
              this.departments = this.departments.filter(d => d.id !== id);
              this.showSuccess('Xóa bộ môn thành công');
            },
            error: () => {
              this.showError('Lỗi khi xóa bộ môn');
            }
          });
        }
      });
    }

    // Hàm sắp xếp
    sort(field: string): void {
      if (this.sortField === field) {
        // Đảo ngược chiều sắp xếp nếu đang sắp xếp cùng trường
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        // Sắp xếp tăng dần nếu là trường mới
        this.sortField = field;
        this.sortDirection = 'asc';
      }
      
      // Cập nhật biểu tượng sắp xếp
      this.updateSortIcons();
      
      // Áp dụng sắp xếp
      this.applySort();
    }
    
    // Cập nhật biểu tượng sắp xếp
    updateSortIcons(): void {
      // Reset tất cả biểu tượng
      Object.keys(this.sortIcons).forEach(key => {
        this.sortIcons[key] = 'bi bi-arrow-down-up';
      });
      
      // Cập nhật biểu tượng cho trường đang sắp xếp
      if (this.sortField && this.sortDirection) {
        this.sortIcons[this.sortField] = this.sortDirection === 'asc' 
          ? 'bi bi-sort-down' 
          : 'bi bi-sort-up';
      }
    }
    
    // Áp dụng sắp xếp
    applySort(): void {
      if (!this.sortField) return;
      
      this.departments.sort((a, b) => {
        let valueA = a[this.sortField];
        let valueB = b[this.sortField];
        
        // Xử lý trường hợp trưởng bộ môn
        if (this.sortField === 'headUser') {
          valueA = valueA ? `${valueA.firstName} ${valueA.lastName}` : '';
          valueB = valueB ? `${valueB.firstName} ${valueB.lastName}` : '';
        }
        
        // Xử lý so sánh
        if (valueA < valueB) {
          return this.sortDirection === 'asc' ? -1 : 1;
        } else if (valueA > valueB) {
          return this.sortDirection === 'asc' ? 1 : -1;
        } else {
          return 0;
        }
      });
    }

    get filteredDepartments(): any[] {
      let result = [...this.departments];
      
      // Áp dụng sắp xếp
      if (this.sortField && this.sortDirection) {
        result.sort((a, b) => {
          let valueA = a[this.sortField];
          let valueB = b[this.sortField];
          
          if (this.sortField === 'headUser') {
            valueA = valueA ? `${valueA.firstName} ${valueA.lastName}` : '';
            valueB = valueB ? `${valueB.firstName} ${valueB.lastName}` : '';
          }
          
          if (valueA < valueB) {
            return this.sortDirection === 'asc' ? -1 : 1;
          } else if (valueA > valueB) {
            return this.sortDirection === 'asc' ? 1 : -1;
          } else {
            return 0;
          }
        });
      }
      
      // Lọc theo tìm kiếm
      if (this.searchText) {
        const searchLower = this.searchText.toLowerCase();
        result = result.filter(dept => 
          dept.name.toLowerCase().includes(searchLower) ||
          dept.description?.toLowerCase().includes(searchLower) ||
          (dept.headUser && (
            dept.headUser.firstName?.toLowerCase().includes(searchLower) ||
            dept.headUser.lastName?.toLowerCase().includes(searchLower)
          ))
        );
      }
      
      return result;
    }

    showSuccess(message: string): void {
      this.snackBar.open(message, 'Đóng', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    }

    showError(message: string): void {
      this.snackBar.open(message, 'Đóng', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    }
  }