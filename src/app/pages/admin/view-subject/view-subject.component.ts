import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SubjectService } from '../../../services/subject.service';
import { DepartmentService } from '../../../services/department.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import Swal from 'sweetalert2';
import { sharedImports } from '../../../shared/shared-imports';
import { SubjectUpsertDialogComponent } from '../subject-upsert.dialog/subject-upsert.dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { SubjectTeachersDialogComponent } from '../subject-teachers.dialog/subject-teachers.dialog.component';

// Loading overlay + operator
import { LoadingScreenComponent } from '../../loading-screen/loading-screen.component';
import { withLoading } from '../../../shared/with-loading';
import { AutoPaperSettingDialogComponent } from '../auto-paper-setting-dialog/auto-paper-setting-dialog.component';

@Component({
  selector: 'app-view-subject',
  standalone: true,
  imports: [
    ...sharedImports,
    LoadingScreenComponent
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

  // Sắp xếp
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
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.departmentId = +this.route.snapshot.paramMap.get('departmentId')!;
    this.loadDepartment();
    this.loadSubjects();
  }

  loadDepartment(): void {
    // Không cần overlay cho phần header, để mượt hơn
    this.departmentService.getAllDepartment().subscribe({
      next: (departments) => {
        this.department = departments.find(d => d.id === this.departmentId);
      },
      error: () => this.showError('Lỗi khi tải thông tin bộ môn')
    });
  }

  loadSubjects(): void {
    this.subjectService.getSubjectsByDepartment(this.departmentId, true)
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: (data) => { this.subjects = data ?? []; },
        error: () => this.showError('Lỗi khi tải danh sách môn học')
      });
  }

  get filteredSubjects(): any[] {
    if (!this.searchText) return this.subjects;
    const term = this.searchText.toLowerCase();
    return this.subjects.filter(s =>
      s.name.toLowerCase().includes(term) ||
      s.code.toLowerCase().includes(term)
    );
  }

  openCreateDialog() {
    if (this.isLoading) return;
    const ref = this.dialog.open(SubjectUpsertDialogComponent, {
      width: '480px',
      data: { mode: 'create', departmentId: this.departmentId }
    });
    ref.afterClosed().subscribe(res => { if (res) this.createSubject(res); });
  }

  openEditDialog(subject: any, e?: Event) {
    e?.stopPropagation();
    if (this.isLoading) return;
    const ref = this.dialog.open(SubjectUpsertDialogComponent, {
      width: '480px',
      data: { mode: 'edit', departmentId: this.departmentId, subject }
    });
    ref.afterClosed().subscribe(res => { if (res) this.updateSubject(subject.id, res); });
  }

  openManageTeachersDialog(subject: any, e?: Event) {
    e?.stopPropagation();
    if (this.isLoading) return;

    // Nạp subject đầy đủ trước khi mở dialog
    this.subjectService.getSubjectById(Number(subject.id))
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: (full) => {
          const ref = this.dialog.open(SubjectTeachersDialogComponent, {
            width: '600px',
            data: { subject: full }
          });

          ref.afterClosed().subscribe((picked?: { id: number }[]) => {
            if (!picked) return;

            const nextIds = picked.map(x => x.id);
            const prevIds = (full.teachers ?? []).map((t: any) => Number(t.id));

            this.subjectService.updateSubjectTeachersDiff(full.id, nextIds, prevIds)
              .pipe(withLoading(v => this.isLoading = v))
              .subscribe({
                next: () => {
                  // nạp lại subject để cập nhật list
                  this.subjectService.getSubjectById(full.id)
                    .pipe(withLoading(v => this.isLoading = v))
                    .subscribe(updated => {
                      const idx = this.subjects.findIndex(s => s.id === full.id);
                      if (idx !== -1) this.subjects[idx] = updated;
                      this.showSuccess('Cập nhật giảng viên thành công');
                    });
                },
                error: () => this.showError('Cập nhật giảng viên thất bại')
              });
          });
        },
        error: () => this.showError('Lỗi khi tải thông tin môn học')
      });
  }

  createSubject(subject: any): void {
    this.subjectService.createSubject(subject)
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: (created) => {
          this.subjects.push(created);
          this.showSuccess('Thêm môn học thành công');

          // Hỏi có phân công GV luôn không
          import('sweetalert2').then(Swal =>
            Swal.default.fire({
              title: 'Phân công giảng viên ngay?',
              text: 'Bạn có muốn chọn giảng viên cho môn vừa tạo?',
              icon: 'question',
              showCancelButton: true,
              confirmButtonText: 'Có',
              cancelButtonText: 'Để sau'
            }).then(res => { if (res.isConfirmed) this.openManageTeachersDialog(created); })
          );
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

  updateSubject(id: number, subject: any): void {
    this.subjectService.updateSubject(id, subject)
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: (data) => {
          const index = this.subjects.findIndex(s => s.id === id);
          if (index !== -1) this.subjects[index] = data;
          this.showSuccess('Cập nhật môn học thành công');
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
    if (this.isLoading) return;
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
      if (!result.isConfirmed) return;
      this.subjectService.deleteSubject(id)
        .pipe(withLoading(v => this.isLoading = v))
        .subscribe({
          next: () => {
            this.subjects = this.subjects.filter(s => s.id !== id);
            this.showSuccess('Xóa môn học thành công');
          },
          error: () => this.showError('Lỗi khi xóa môn học')
        });
    });
  }

  // ===== Sắp xếp =====
  sort(field: string): void {
    if (this.isLoading) return;
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
      this.sortIcons[this.sortField] =
        this.sortDirection === 'asc' ? 'bi bi-sort-down' : 'bi bi-sort-up';
    }
  }

  applySort(): void {
    if (!this.sortField) return;
    this.subjects.sort((a, b) => {
      const valueA = a[this.sortField];
      const valueB = b[this.sortField];
      if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // ===== Toast helpers =====
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

  openSettingDialog(subject: any, e?: Event) {
    e?.stopPropagation();
    if (this.isLoading) return;

    const ref = this.dialog.open(AutoPaperSettingDialogComponent, {
      width: '1100px',
      data: { subjectId: Number(subject.id) }
    });

    ref.afterClosed().subscribe(res => {
      if (res) this.showSuccess('Đã lưu cấu hình đề tự động');
    });
  }
}
