// head-subject-list.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import Swal from 'sweetalert2';
import { sharedImports } from '../../../shared/shared-imports';
import { SubjectService } from '../../../services/subject.service';
import { DepartmentService } from '../../../services/department.service';
import { LoginService } from '../../../services/login.service';

@Component({
  selector: 'app-head-subject-list',
  standalone: true,
  imports: [...sharedImports],
  templateUrl: './head-subject-list.component.html',
  styleUrls: ['../../admin/view-subject/view-subject.component.css'] // tái dùng css admin nếu muốn
})
export class HeadSubjectListComponent implements OnInit {
  departmentId!: number;
  department: any;
  subjects: any[] = [];
  isLoading = true;
  searchText = '';

  sortField: string = '';
  sortDirection: 'asc' | 'desc' | '' = '';
  sortIcons: { [key: string]: string } = {
    'id': 'bi bi-arrow-down-up',
    'name': 'bi bi-arrow-down-up',
    'code': 'bi bi-arrow-down-up'
  };

  constructor(
    private deptService: DepartmentService,
    private subjectService: SubjectService,
    private snackBar: MatSnackBar,
    public router: Router,
    private loginSvc: LoginService
  ) { }

  ngOnInit(): void {
    const headUserId = this.loginSvc.getUserId() ?? this.loginSvc.getUser()?.id ?? 0;
    // Gọi /department/head/{headUserId} -> lấy dept đầu tiên
    this.deptService.getDepartmentsByHead(headUserId).subscribe({
      next: (depts) => {
        if (!depts || depts.length === 0) {
          this.isLoading = false;
          this.showError('Bạn chưa được gán làm HEAD của bộ môn nào.');
          return;
        }
        this.department = depts[0];
        this.departmentId = this.department.id;
        this.loadSubjects();
      },
      error: () => {
        this.isLoading = false;
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
    if (!this.searchText) return this.subjects;
    const term = this.searchText.toLowerCase();
    return this.subjects.filter(s =>
      s.name?.toLowerCase().includes(term) || s.code?.toLowerCase().includes(term)
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
        const name = (document.getElementById('name') as HTMLInputElement).value?.trim();
        const code = (document.getElementById('code') as HTMLInputElement).value?.trim();

        if (!name || !code) {
          Swal.showValidationMessage('Tên và mã môn học là bắt buộc');
          return false;
        }

        return { name, code, departmentId: this.departmentId };
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
        // nếu muốn cập nhật sắp xếp sau khi thêm:
        this.applySort();
      },
      error: (err) => {
        if (err?.error && typeof err.error === 'string' && err.error.includes('already exists')) {
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
          <input type="text" id="name" class="swal2-input" value="${subject.name ?? ''}" required>
        </div>
        <div class="mb-3">
          <label for="code" class="form-label">Mã môn học</label>
          <input type="text" id="code" class="swal2-input" value="${subject.code ?? ''}" required>
        </div>
      </div>
    `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Cập nhật',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        const name = (document.getElementById('name') as HTMLInputElement).value?.trim();
        const code = (document.getElementById('code') as HTMLInputElement).value?.trim();

        if (!name || !code) {
          Swal.showValidationMessage('Tên và mã môn học là bắt buộc');
          return false;
        }

        return { name, code };
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
        const idx = this.subjects.findIndex(s => s.id === id);
        if (idx !== -1) this.subjects[idx] = data;
        this.showSuccess('Cập nhật môn học thành công');
        this.applySort();
      },
      error: (err) => {
        if (err?.error && typeof err.error === 'string' && err.error.includes('already exists')) {
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
    }).then((res) => {
      if (!res.isConfirmed) return;

      this.subjectService.deleteSubject(id).subscribe({
        next: () => {
          this.subjects = this.subjects.filter(s => s.id !== id);
          this.showSuccess('Xóa môn học thành công');
        },
        error: () => this.showError('Lỗi khi xóa môn học')
      });
    });
  }

  openManageTeachersDialog(subject: any): void {
    // nạp lại subject kèm teachers rồi mở dialog
    this.subjectService.getSubjectById(subject.id).subscribe({
      next: (full) => this.showTeachersManagementDialog(full),
      error: () => this.showError('Lỗi khi tải thông tin giáo viên')
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
          ? subject.teachers.map((t: any) => `
                <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                  <div>
                    ${t.firstName ?? ''} ${t.lastName ?? ''} 
                    <span class="badge bg-secondary ms-2">ID: ${t.id}</span>
                  </div>
                  <button class="btn btn-sm btn-danger remove-teacher" data-teacher-id="${t.id}">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              `).join('')
          : '<p class="text-muted">Chưa có giảng viên nào</p>'
        }
        </div>
      </div>
    `,
      width: '600px',
      focusConfirm: false,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Đóng'
    }).then(() => { /* close */ });

    // gắn event sau khi DOM swal render
    setTimeout(() => {
      const addBtn = document.getElementById('addTeacherBtn');
      if (addBtn) {
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const teacherId = (document.getElementById('teacherId') as HTMLInputElement).value;
          if (teacherId) this.assignTeacher(subject.id, +teacherId);
        });
      }

      document.querySelectorAll('.remove-teacher').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const teacherId = (btn as HTMLElement).getAttribute('data-teacher-id');
          if (teacherId) this.removeTeacher(subject.id, +teacherId);
        });
      });
    }, 0);
  }

  assignTeacher(subjectId: number, teacherId: number): void {
    this.subjectService.assignTeacher(subjectId, teacherId).subscribe({
      next: () => {
        this.showSuccess('Phân công giảng viên thành công');
        // cập nhật UI của list + dialog
        const idx = this.subjects.findIndex(s => s.id === subjectId);
        if (idx !== -1) {
          this.subjectService.getSubjectById(subjectId).subscribe({
            next: (updated) => {
              this.subjects[idx] = updated;
              this.showTeachersManagementDialog(updated); // mở lại dialog với danh sách mới
            }
          });
        }
      },
      error: () => this.showError('Lỗi khi phân công giảng viên')
    });
  }

  removeTeacher(subjectId: number, teacherId: number): void {
    this.subjectService.removeTeacher(subjectId, teacherId).subscribe({
      next: () => {
        this.showSuccess('Hủy phân công giảng viên thành công');
        const idx = this.subjects.findIndex(s => s.id === subjectId);
        if (idx !== -1) {
          this.subjectService.getSubjectById(subjectId).subscribe({
            next: (updated) => {
              this.subjects[idx] = updated;
              this.showTeachersManagementDialog(updated);
            }
          });
        }
      },
      error: () => this.showError('Lỗi khi hủy phân công giảng viên')
    });
  }


  sort(field: string): void {
    if (this.sortField === field) this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    else { this.sortField = field; this.sortDirection = 'asc'; }
    this.updateSortIcons();
    this.applySort();
  }
  updateSortIcons(): void {
    Object.keys(this.sortIcons).forEach(k => this.sortIcons[k] = 'bi bi-arrow-down-up');
    if (this.sortField && this.sortDirection)
      this.sortIcons[this.sortField] = this.sortDirection === 'asc' ? 'bi bi-sort-down' : 'bi bi-sort-up';
  }
  applySort(): void {
    if (!this.sortField) return;
    this.subjects.sort((a, b) => {
      const A = a[this.sortField], B = b[this.sortField];
      if (A < B) return this.sortDirection === 'asc' ? -1 : 1;
      if (A > B) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  showSuccess(msg: string) { this.snackBar.open(msg, 'Đóng', { duration: 3000, panelClass: ['success-snackbar'] }); }
  showError(msg: string) { this.snackBar.open(msg, 'Đóng', { duration: 3000, panelClass: ['error-snackbar'] }); }
}
