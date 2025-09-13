// src/app/pages/head/head-subject-list/head-subject-list.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';

import { sharedImports } from '../../../shared/shared-imports';
import { SubjectService } from '../../../services/subject.service';
import { DepartmentService } from '../../../services/department.service';
import { LoginService } from '../../../services/login.service';

// tái dùng 2 dialog đã làm ở /pages/admin/**
import { SubjectUpsertDialogComponent } from '../../admin/subject-upsert.dialog/subject-upsert.dialog.component';
import { SubjectTeachersDialogComponent } from '../../admin/subject-teachers.dialog/subject-teachers.dialog.component';

// loading screen
import { LoadingScreenComponent } from '../../loading-screen/loading-screen.component';
import { withLoading } from '../../../shared/with-loading';

@Component({
  selector: 'app-head-subject-list',
  standalone: true,
  imports: [...sharedImports, LoadingScreenComponent],
  templateUrl: './head-subject-list.component.html',
  // tái dùng css admin cho bảng
  styleUrls: ['../../admin/view-subject/view-subject.component.css']
})
export class HeadSubjectListComponent implements OnInit {
  departmentId!: number;
  department: any;
  subjects: any[] = [];
  isLoading = true;
  searchText = '';

  sortField: string = '';
  sortDirection: 'asc' | 'desc' | '' = '';
  sortIcons: Record<string, string> = {
    id: 'bi bi-arrow-down-up',
    name: 'bi bi-arrow-down-up',
    code: 'bi bi-arrow-down-up',
  };

  constructor(
    private deptService: DepartmentService,
    private subjectService: SubjectService,
    private snackBar: MatSnackBar,
    public router: Router,
    private loginSvc: LoginService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const headUserId = this.loginSvc.getUserId() ?? this.loginSvc.getUser()?.id ?? 0;

    this.deptService.getDepartmentsByHead(headUserId)
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: (depts) => {
          if (!depts?.length) {
            this.showError('Bạn chưa được gán làm HEAD của bộ môn nào.');
            return;
          }
          this.department = depts[0];
          this.departmentId = this.department.id;
          this.loadSubjects();
        },
        error: () => {
          this.showError('Lỗi khi tải thông tin bộ môn');
        },
      });
  }

  loadSubjects(): void {
    this.subjects = [];
    this.subjectService.getSubjectsByDepartment(this.departmentId, true)
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: (data) => { this.subjects = data ?? []; },
        error: () => { this.showError('Lỗi khi tải danh sách môn học'); }
      });
  }

  // ----- Filter + Sort -----
  get filteredSubjects(): any[] {
    if (!this.searchText) return this.subjects;
    const term = this.searchText.toLowerCase();
    return this.subjects.filter(s =>
      s.name?.toLowerCase().includes(term) || s.code?.toLowerCase().includes(term)
    );
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

  // ----- CRUD -----
  openCreateDialog(): void {
    const ref = this.dialog.open(SubjectUpsertDialogComponent, {
      width: '480px',
      data: { mode: 'create', departmentId: this.departmentId }
    });
    ref.afterClosed().subscribe(res => { if (res) this.createSubject(res); });
  }

  createSubject(subject: any): void {
    this.subjectService.createSubject(subject)
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: (created) => {
          this.subjects.push(created);
          this.showSuccess('Thêm môn học thành công');
          this.applySort();

          // hỏi phân công ngay
          import('sweetalert2').then(Swal =>
            Swal.default.fire({
              title: 'Phân công giảng viên ngay?',
              text: 'Bạn có muốn chọn giảng viên cho môn vừa tạo?',
              icon: 'question',
              showCancelButton: true,
              confirmButtonText: 'Có',
              cancelButtonText: 'Để sau'
            }).then(res => {
              if (res.isConfirmed) this.openManageTeachersDialog(created);
            })
          );
        },
        error: (err) => {
          if (err?.error && typeof err.error === 'string' && err.error.includes('already exists'))
            this.showError('Mã môn học đã tồn tại');
          else this.showError('Lỗi khi thêm môn học');
        }
      });
  }

  openEditDialog(subject: any, e?: Event): void {
    e?.stopPropagation();
    const ref = this.dialog.open(SubjectUpsertDialogComponent, {
      width: '480px',
      data: { mode: 'edit', departmentId: this.departmentId, subject }
    });
    ref.afterClosed().subscribe(res => { if (res) this.updateSubject(subject.id, res); });
  }

  updateSubject(id: number, subject: any): void {
    this.subjectService.updateSubject(id, subject)
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: (data) => {
          const idx = this.subjects.findIndex(s => s.id === id);
          if (idx !== -1) this.subjects[idx] = data;
          this.showSuccess('Cập nhật môn học thành công');
          this.applySort();
        },
        error: (err) => {
          if (err?.error && typeof err.error === 'string' && err.error.includes('already exists'))
            this.showError('Mã môn học đã tồn tại');
          else this.showError('Lỗi khi cập nhật môn học');
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

  // ----- Teachers (multi-select) -----
  openManageTeachersDialog(subject: any, e?: Event): void {
    e?.stopPropagation();

    // luôn fetch subject full (có teachers) trước khi mở dialog
    this.subjectService.getSubjectById(Number(subject.id))
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: (full) => {
          const ref = this.dialog.open(SubjectTeachersDialogComponent, {
            width: '600px',
            data: { subject: full } // dialog đã phòng thủ teachers rỗng
          });

          ref.afterClosed().subscribe((picked?: { id: number }[]) => {
            if (!picked) return;

            const nextIds = picked.map(x => x.id);
            const prevIds = (full.teachers ?? []).map((t: any) => Number(t.id));

            // gọi diff add/remove để sync danh sách GV
            this.subjectService.updateSubjectTeachersDiff(full.id, nextIds, prevIds)
              .pipe(withLoading(v => this.isLoading = v))
              .subscribe({
                next: () => {
                  // refresh lại subject trong list
                  this.subjectService.getSubjectById(full.id)
                    .pipe(withLoading(v => this.isLoading = v))
                    .subscribe(updated => {
                      const idx = this.subjects.findIndex(s => s.id === full.id);
                      if (idx !== -1) this.subjects[idx] = updated;
                      this.showSuccess('Cập nhật giảng viên thành công');
                    });
                }
              });
          });
        },
        error: () => this.showError('Lỗi khi tải thông tin môn học')
      });
  }

  // ----- Toast -----
  showSuccess(msg: string) {
    this.snackBar.open(msg, 'Đóng', { duration: 3000, panelClass: ['success-snackbar'] });
  }
  showError(msg: string) {
    this.snackBar.open(msg, 'Đóng', { duration: 3000, panelClass: ['error-snackbar'] });
  }
}
