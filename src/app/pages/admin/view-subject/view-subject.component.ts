import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SubjectService } from '../../../services/subject.service';
import { DepartmentService } from '../../../services/department.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import Swal from 'sweetalert2';
import { sharedImports } from '../../../shared/shared-imports';

@Component({
  selector: 'app-view-subject',
  standalone: true,
  imports: [
    ...sharedImports
  ],
  templateUrl: './view-subject.component.html',
  styleUrls: ['./view-subject.component.css']
})
export class ViewSubjectComponent implements OnInit {
  departmentId!: number;
  department: any;
  subjects: any[] = [];
  isLoading = true;
  searchText = '';

  // Biến cho chức năng sắp xếp
  sortField: string = '';
  sortDirection: 'asc' | 'desc' | '' = '';
  sortIcons: { [key: string]: string } = {
    'id': 'bi bi-arrow-down-up',
    'name': 'bi bi-arrow-down-up',
    'code': 'bi bi-arrow-down-up'
  };

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private subjectService: SubjectService,
    private departmentService: DepartmentService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.departmentId = +this.route.snapshot.paramMap.get('departmentId')!;
    this.loadDepartment();
    this.loadSubjects();
  }

  loadDepartment(): void {
    this.departmentService.getAllDepartment().subscribe({
      next: (departments) => {
        this.department = departments.find(d => d.id === this.departmentId);
      },
      error: () => {
        this.showError('Lỗi khi tải thông tin bộ môn');
      }
    });
  }

  loadSubjects(): void {
    this.isLoading = true;
    this.subjectService.getSubjectsByDepartment(this.departmentId).subscribe({
      next: (data) => {
        this.subjects = data;
        this.isLoading = false;
      },
      error: () => {
        this.showError('Lỗi khi tải danh sách môn học');
        this.isLoading = false;
      }
    });
  }

  get filteredSubjects(): any[] {
    if (!this.searchText) {
      return this.subjects;
    }
    const term = this.searchText.toLowerCase();
    return this.subjects.filter(s =>
      s.name.toLowerCase().includes(term) ||
      s.code.toLowerCase().includes(term)
    );
  }


  openCreateDialog(): void {
    Swal.fire({
      title: 'Thêm môn học mới',
      html: `
        <div class="swal-form">
          <div class="mb-3">
            <label for="name" class="form-label">Tên môn học</label>
            <input type="text" id="name" class="swal2-input" placeholder="Nhập tên môn học" required>
          </div>
          <div class="mb-3">
            <label for="code" class="form-label">Mã môn học</label>
            <input type="text" id="code" class="swal2-input" placeholder="Nhập mã môn học" required>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Thêm',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        const name = (document.getElementById('name') as HTMLInputElement).value;
        const code = (document.getElementById('code') as HTMLInputElement).value;

        if (!name || !code) {
          Swal.showValidationMessage('Tên và mã môn học là bắt buộc');
          return false;
        }

        return {
          name,
          code,
          departmentId: this.departmentId
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.createSubject(result.value);
      }
    });
  }

  createSubject(subject: any): void {
    this.subjectService.createSubject(subject).subscribe({
      next: (data) => {
        this.subjects.push(data);
        this.showSuccess('Thêm môn học thành công');
      },
      error: (err) => {
        if (err.error && err.error.includes('already exists')) {
          this.showError('Mã môn học đã tồn tại');
        } else {
          this.showError('Lỗi khi thêm môn học');
        }
      }
    });
  }

  openEditDialog(subject: any): void {
    Swal.fire({
      title: 'Cập nhật môn học',
      html: `
        <div class="swal-form">
          <div class="mb-3">
            <label for="name" class="form-label">Tên môn học</label>
            <input type="text" id="name" class="swal2-input" value="${subject.name}" required>
          </div>
          <div class="mb-3">
            <label for="code" class="form-label">Mã môn học</label>
            <input type="text" id="code" class="swal2-input" value="${subject.code}" required>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Cập nhật',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        const name = (document.getElementById('name') as HTMLInputElement).value;
        const code = (document.getElementById('code') as HTMLInputElement).value;

        if (!name || !code) {
          Swal.showValidationMessage('Tên và mã môn học là bắt buộc');
          return false;
        }

        return {
          name,
          code
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.updateSubject(subject.id, result.value);
      }
    });
  }

  updateSubject(id: number, subject: any): void {
    this.subjectService.updateSubject(id, subject).subscribe({
      next: (data) => {
        const index = this.subjects.findIndex(s => s.id === id);
        if (index !== -1) {
          this.subjects[index] = data;
        }
        this.showSuccess('Cập nhật môn học thành công');
      },
      error: (err) => {
        if (err.error && err.error.includes('already exists')) {
          this.showError('Mã môn học đã tồn tại');
        } else {
          this.showError('Lỗi khi cập nhật môn học');
        }
      }
    });
  }

  deleteSubject(id: number): void {
    Swal.fire({
      title: 'Xác nhận xóa',
      text: 'Bạn có chắc chắn muốn xóa môn học này?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        this.subjectService.deleteSubject(id).subscribe({
          next: () => {
            this.subjects = this.subjects.filter(s => s.id !== id);
            this.showSuccess('Xóa môn học thành công');
          },
          error: () => {
            this.showError('Lỗi khi xóa môn học');
          }
        });
      }
    });
  }

  openManageTeachersDialog(subject: any): void {
    // Tải thông tin chi tiết môn học với danh sách giáo viên
    this.subjectService.getSubjectById(subject.id).subscribe({
      next: (subjectWithTeachers) => {
        this.showTeachersManagementDialog(subjectWithTeachers);
      },
      error: () => {
        this.showError('Lỗi khi tải thông tin giáo viên');
      }
    });
  }

  showTeachersManagementDialog(subject: any): void {
    Swal.fire({
      title: `Quản lý giảng viên: ${subject.name}`,
      html: `
        <div class="swal-form">
          <div class="mb-3">
            <label class="form-label">Thêm giảng viên</label>
            <input type="number" id="teacherId" class="swal2-input" placeholder="Nhập ID giảng viên">
            <button id="addTeacherBtn" class="btn btn-primary mt-2 w-100">Thêm giảng viên</button>
          </div>
          
          <h5 class="mt-4">Danh sách giảng viên</h5>
          <div class="teacher-list">
            ${subject.teachers && subject.teachers.length > 0
          ? subject.teachers.map((teacher: { firstName: any; lastName: any; id: any; }) => `
                <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                  <div>
                    ${teacher.firstName} ${teacher.lastName} 
                    <span class="badge bg-secondary ms-2">ID: ${teacher.id}</span>
                  </div>
                  <button 
                    class="btn btn-sm btn-danger remove-teacher" 
                    data-teacher-id="${teacher.id}">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              `).join('')
          : '<p class="text-muted">Chưa có giảng viên nào</p>'}
          </div>
        </div>
      `,
      width: '600px',
      focusConfirm: false,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Đóng'
    }).then(() => {
      // Xử lý khi đóng dialog
    });

    // Xử lý sự kiện thêm giảng viên
    setTimeout(() => {
      const addButton = document.getElementById('addTeacherBtn');
      if (addButton) {
        addButton.addEventListener('click', () => {
          const teacherId = (document.getElementById('teacherId') as HTMLInputElement).value;
          if (teacherId) {
            this.assignTeacher(subject.id, +teacherId);
          }
        });
      }

      // Xử lý sự kiện xóa giảng viên
      const removeButtons = document.querySelectorAll('.remove-teacher');
      removeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          const teacherId = button.getAttribute('data-teacher-id');
          if (teacherId) {
            this.removeTeacher(subject.id, +teacherId);
          }
          e.stopPropagation();
        });
      });
    }, 0);
  }

  assignTeacher(subjectId: number, teacherId: number): void {
    this.subjectService.assignTeacher(subjectId, teacherId).subscribe({
      next: () => {
        this.showSuccess('Phân công giảng viên thành công');

        // Cập nhật UI
        const subjectIndex = this.subjects.findIndex(s => s.id === subjectId);
        if (subjectIndex !== -1) {
          this.subjectService.getSubjectById(subjectId).subscribe({
            next: (updatedSubject) => {
              this.subjects[subjectIndex] = updatedSubject;
              this.showTeachersManagementDialog(updatedSubject);
            }
          });
        }
      },
      error: () => {
        this.showError('Lỗi khi phân công giảng viên');
      }
    });
  }

  removeTeacher(subjectId: number, teacherId: number): void {
    this.subjectService.removeTeacher(subjectId, teacherId).subscribe({
      next: () => {
        this.showSuccess('Hủy phân công giảng viên thành công');

        // Cập nhật UI
        const subjectIndex = this.subjects.findIndex(s => s.id === subjectId);
        if (subjectIndex !== -1) {
          this.subjectService.getSubjectById(subjectId).subscribe({
            next: (updatedSubject) => {
              this.subjects[subjectIndex] = updatedSubject;
              this.showTeachersManagementDialog(updatedSubject);
            }
          });
        }
      },
      error: () => {
        this.showError('Lỗi khi hủy phân công giảng viên');
      }
    });
  }

  // Hàm sắp xếp (tương tự như trong Department)
  sort(field: string): void {
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
    Object.keys(this.sortIcons).forEach(key => {
      this.sortIcons[key] = 'bi bi-arrow-down-up';
    });

    if (this.sortField && this.sortDirection) {
      this.sortIcons[this.sortField] = this.sortDirection === 'asc'
        ? 'bi bi-sort-down'
        : 'bi bi-sort-up';
    }
  }

  applySort(): void {
    if (!this.sortField) return;

    this.subjects.sort((a, b) => {
      const valueA = a[this.sortField];
      const valueB = b[this.sortField];

      if (valueA < valueB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      } else if (valueA > valueB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      } else {
        return 0;
      }
    });
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