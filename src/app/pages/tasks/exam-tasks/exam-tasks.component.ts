import { Component, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { debounceTime, Subject, takeUntil, startWith, switchMap } from 'rxjs';
import { sharedImports } from '../../../shared/shared-imports';
import { ExamTaskService } from '../../../services/exam-task.service';
import { LoginService } from '../../../services/login.service';
import { ExamTask, ExamTaskStatus } from '../../../models/exam-task';
import { PageResult } from '../../../models/pageResult';
import { AssignTaskDialogComponent, AssignTaskDialogData } from '../assign-task-dialog/assign-task-dialog.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { SubjectService } from '../../../services/subject.service';
import { DepartmentService } from '../../../services/department.service';
import { forkJoin, of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import Swal from 'sweetalert2';
import { UploadQuestionsDialogComponent } from '../../admin/upload-questions-dialog/upload-questions-dialog.component';
import { LoadingScreenComponent } from "../../loading-screen/loading-screen.component";
import { ActivatedRoute, Router } from '@angular/router';

interface SubjectWithTeachers {
  id: number;
  name: string;
  code: string;
}

@Component({
  selector: 'app-exam-tasks',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    ...sharedImports,
    MatPaginatorModule,
    MatAutocompleteModule,
    LoadingScreenComponent
  ],
  templateUrl: './exam-tasks.component.html',
  styleUrls: ['./exam-tasks.component.css']
})
export class ExamTasksComponent implements OnInit, OnDestroy {
  private api = inject(ExamTaskService);
  private fb = inject(FormBuilder);
  private login = inject(LoginService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // NEW: services để lấy list môn theo khoa HEAD
  private subjSvc = inject(SubjectService);
  private deptSvc = inject(DepartmentService);

  private destroy$ = new Subject<void>();

  role = this.login.getUserRole();
  isHead = this.role === 'HEAD';
  isTeacher = this.role === 'TEACHER';

  // Form lọc: subjectId để BE lọc; subjectText chỉ dùng cho UI autocomplete
  filterForm = this.fb.group({
    subjectId: [null as number | null],
    status: ['' as '' | ExamTaskStatus],
    from: [null as Date | null],
    to: [null as Date | null],
  });

  // NEW: text hiển thị + danh sách môn
  subjectText = new FormControl<string>('', { nonNullable: true });
  subjects: SubjectWithTeachers[] = [];
  filteredSubjects: SubjectWithTeachers[] = [];
  isLoadingSubjects = false;

  pageIndex = 0;
  pageSize = 10;
  total = 0;

  displayedColumns = ['title', 'subject', 'assignee', 'status', 'due', 'created', 'actions'];
  rows: ExamTask[] = [];

  isLoading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    // 1) Load list môn cho autocomplete (nếu HEAD); Teacher vẫn có thể lọc theo môn nếu muốn
    this.loadSubjectsForPicker();

    // 2) Khi form filter đổi → reset page & load
    this.filterForm.valueChanges
      .pipe(debounceTime(200), takeUntil(this.destroy$))
      .subscribe(() => { this.pageIndex = 0; this.load(); });

    // 3) Filter autocomplete theo text
    this.subjectText.valueChanges
      .pipe(startWith(this.subjectText.value), debounceTime(120), takeUntil(this.destroy$))
      .subscribe(q => {
        const s = (q || '').toLowerCase().trim();
        this.filteredSubjects = !s
          ? this.subjects
          : this.subjects.filter(x =>
            x.name.toLowerCase().includes(s) ||
            x.code.toLowerCase().includes(s) ||
            String(x.id).includes(s)
          );
      });

    // 4) Lần đầu: load task ngay với subjectId=null (=> HEAD thấy tất cả khoa mình)
    this.load();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private loadSubjectsForPicker() {
    const me = this.login.getUser();
    this.isLoadingSubjects = true;

    // Lấy các khoa mà user là HEAD -> gộp danh sách môn của từng khoa
    this.deptSvc.getDepartmentsByHead(me?.id ?? 0).pipe(
      // Nếu không phải HEAD hoặc không có khoa nào -> trả [] (autocomplete vẫn hoạt động nếu sau đó thêm API khác)
      // Với Teacher, bạn có thể tùy chọn load toàn bộ môn của khoa mình dạy (nếu có API), còn ở đây để rỗng cũng OK.
      // Ở FE, nếu subjects rỗng, trường môn vẫn cho nhập nhưng không suggest.
      switchMap((depts: any[]) => {
        if (!Array.isArray(depts) || depts.length === 0) return of([] as any[][]);
        const calls = depts.map(d => this.subjSvc.getSubjectsByDepartment(d.id, /*includeTeachers*/ false));
        return forkJoin(calls); // Observable<any[][]>
      })
    ).subscribe({
      next: (listOfLists: any[][]) => {
        const flat = (listOfLists || []).flat() as SubjectWithTeachers[];
        const uniq = new Map<number, SubjectWithTeachers>();
        for (const s of flat) uniq.set(s.id, s);
        this.subjects = Array.from(uniq.values());
        this.filteredSubjects = this.subjects;
      },
      error: _ => { },
      complete: () => this.isLoadingSubjects = false
    });
  }

  ymd(d?: Date | null) {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  onPage(e: PageEvent) { this.pageIndex = e.pageIndex; this.pageSize = e.pageSize; this.load(); }

  private load() {
    const f = this.filterForm.value;
    const from = this.ymd(f.from || undefined) || undefined;
    const to = this.ymd(f.to || undefined) || undefined;
    const status = (f.status as ExamTaskStatus) || undefined;

    this.isLoading = true;
    this.api.list({
      subjectId: f.subjectId ?? undefined, // <= null -> undefined -> BE không lọc, HEAD sẽ thấy tất cả
      status, from, to,
      page: this.pageIndex, size: this.pageSize
    }).subscribe({
      next: (page: PageResult<ExamTask>) => {
        this.rows = page.content;
        this.total = page.totalElements;
      },
      error: err => console.error(err),
      complete: () => this.isLoading = false
    });
  }

  // ===== NEW: autocomplete helpers =====
  displaySubject(s?: SubjectWithTeachers | null) {
    return s ? `${s.name} — ${s.code}` : '';
  }

  onPickSubject(s: SubjectWithTeachers) {
    this.subjectText.setValue(this.displaySubject(s));
    this.filterForm.controls.subjectId.setValue(s.id);
    // filterForm đã subscribe valueChanges ở trên -> tự load()
  }

  syncSubjectOnBlur() {
    const txt = (this.subjectText.value || '').trim().toLowerCase();
    if (!txt) { this.filterForm.controls.subjectId.setValue(null); return; }
    const exact = this.subjects.filter(s => `${s.name} — ${s.code}`.toLowerCase() === txt);
    this.filterForm.controls.subjectId.setValue(exact.length === 1 ? exact[0].id : null);
  }

  clearSubject() {
    this.subjectText.setValue('');
    this.filterForm.controls.subjectId.setValue(null); // => BE không lọc theo môn
  }

  openEdit(t: ExamTask) {
    const data: AssignTaskDialogData = {
      mode: 'edit',
      id: t.id,
      subjectId: t.subjectId,
      assignedToId: t.assignedToId,
      title: t.title,
      instructions: t.instructions ?? '',
      dueAt: t.dueAt ?? null
    } as any;

    const ref = this.dialog.open(AssignTaskDialogComponent, {
      data, width: '720px', autoFocus: false, restoreFocus: false
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const payload = {
        subjectId: result.subjectId,
        assignedToId: result.assignedToId,
        title: result.title,
        instructions: result.instructions,
        structureJson: '',
        dueAt: result.dueAt
      };
      this.isLoading = true;
      this.api.update(t.id, payload as any).subscribe({
        next: (u) => {
          this.updateRow(u);
          this.showSuccess('Đã cập nhật nhiệm vụ');
        },
        error: err => {
          console.error(err);
          this.showError(err?.error?.message ?? 'Cập nhật thất bại');
        },
        complete: () => this.isLoading = false
      });
    });
  }

  // ===== Dialog giao nhiệm vụ =====
  openAssignDialog() {
    const data: AssignTaskDialogData = {
      subjectId: this.filterForm.value.subjectId ?? null
    };
    const ref = this.dialog.open(AssignTaskDialogComponent, {
      data,
      width: '720px',
      autoFocus: false,
      restoreFocus: false,
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const payload = {
        subjectId: result.subjectId,
        assignedToId: result.assignedToId,
        title: result.title,
        instructions: result.instructions,
        structureJson: '',
        dueAt: result.dueAt,
      };
      this.isLoading = true;
      this.isLoading = true;
      this.api.create(payload as any).subscribe({
        next: _ => {
          this.pageIndex = 0;
          this.load();

          // Swal success khi tạo xong
          Swal.fire({
            icon: 'success',
            title: 'Đã giao nhiệm vụ',
            text: 'Nhiệm vụ đã được tạo và thông báo đến giảng viên.',
            timer: 1500,
            showConfirmButton: false
          });
        },
        error: err => {
          console.error(err);
          Swal.fire({
            icon: 'error',
            title: 'Không thể tạo nhiệm vụ',
            text: err?.error?.message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.'
          });
        },
        complete: () => this.isLoading = false
      });
    });
  }

  // ===== Actions per role (giữ nguyên)
  canDone(t: ExamTask) { return this.isTeacher && (t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS'); }

  async cancelTask(t: ExamTask) {
    const cfm = await Swal.fire({
      icon: 'warning',
      title: 'Huỷ nhiệm vụ?',
      html: `Bạn sắp huỷ nhiệm vụ:<br><b>${t.title}</b>`,
      showCancelButton: true,
      confirmButtonText: 'Huỷ nhiệm vụ',
      cancelButtonText: 'Không',
      confirmButtonColor: '#d33'
    });

    if (!cfm.isConfirmed) return;

    this.isLoading = true;
    this.api.cancel(t.id).subscribe({
      next: (res) => {
        this.updateRow(res);
        Swal.fire({
          icon: 'success',
          title: 'Đã huỷ nhiệm vụ',
          timer: 1200,
          showConfirmButton: false
        });
      },
      error: err => {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: 'Huỷ thất bại',
          text: err?.error?.message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.'
        });
      },
      complete: () => this.isLoading = false
    });
  }

  async deleteTask(t: ExamTask) {
    const cfm = await Swal.fire({
      icon: 'warning',
      title: 'Xoá vĩnh viễn?',
      html: `Hành động này không thể hoàn tác.<br><b>${t.title}</b>`,
      showCancelButton: true,
      confirmButtonText: 'Xoá',
      cancelButtonText: 'Không',
      confirmButtonColor: '#d33'
    });
    if (!cfm.isConfirmed) return;

    this.isLoading = true;
    this.api.delete(t.id).subscribe({
      next: () => {
        this.rows = this.rows.filter(x => x.id !== t.id);
        this.total = Math.max(0, this.total - 1);
        this.showSuccess('Đã xoá nhiệm vụ');
      },
      error: err => {
        console.error(err);
        this.showError(err?.error?.message ?? 'Xoá thất bại');
      },
      complete: () => this.isLoading = false
    });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Đóng', {
      duration: 3000,
      verticalPosition: 'top',
      horizontalPosition: 'right',
      panelClass: ['snack', 'snack-success'],
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Đóng', {
      duration: 3000,
      verticalPosition: 'top',
      horizontalPosition: 'right',
      panelClass: ['snack', 'snack-error'],
    });
  }

  // ==== Actions (Teacher) ====
  startTask(t: ExamTask) {
    this.isLoading = true;
    // dùng route mới /start; nếu muốn giữ route cũ: this.api.updateStatus(t.id,'IN_PROGRESS')
    this.api.start(t.id).subscribe({
      next: (res) => { this.updateRow(res); this.showSuccess('Bắt đầu thực hiện'); },
      error: err => { console.error(err); this.showError(err?.error?.message ?? 'Không thể bắt đầu'); },
      complete: () => this.isLoading = false
    });
  }

  async submitTask(t: ExamTask) {
    const ref = this.dialog.open(UploadQuestionsDialogComponent, {
      width: '560px',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: t.status === 'SUBMITTED' ? 'Nộp lại tệp' : 'Nộp bài',
        accept: '.zip,.doc,.docx,.pdf,.rar,.7z',
        maxSizeMb: 50,
        hideSaveCopy: true,   // ẨN checkbox
        showNote: true,       // HIỆN ghi chú
        primaryText: 'Nộp bài'    // Đổi nút chính
      }
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const { file, note } = result;

      this.isLoading = true;
      this.api.submit(t.id, file, note).subscribe({
        next: (u) => {
          this.updateRow(u);
          Swal.fire({
            icon: 'success',
            title: (t.status === 'SUBMITTED' ? 'Đã nộp lại' : 'Đã nộp bài'),
            timer: 1400,
            showConfirmButton: false
          });
        },
        error: err => {
          console.error(err);
          Swal.fire({
            icon: 'error',
            title: 'Nộp thất bại',
            text: err?.error?.message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.'
          });
        },
        complete: () => this.isLoading = false
      });
    });
  }

  async reportTask(t: ExamTask) {
    const { value: note } = await Swal.fire({
      icon: 'info',
      title: 'Báo lỗi nhiệm vụ',
      input: 'textarea',
      inputPlaceholder: 'Mô tả vấn đề (tuỳ chọn)…',
      showCancelButton: true,
      confirmButtonText: 'Gửi báo lỗi'
    });
    if (note === undefined) return; // đóng without confirm

    this.isLoading = true;
    this.api.report(t.id, note).subscribe({
      next: (u) => { this.updateRow(u); this.showSuccess('Đã gửi báo lỗi tới HEAD'); },
      error: err => { console.error(err); this.showError(err?.error?.message ?? 'Gửi báo lỗi thất bại'); },
      complete: () => this.isLoading = false
    });
  }

  openPendingInArchive(t: ExamTask) {
    const dest = t.status === 'SUBMITTED' ? 'pending' : 'submissions';
    this.router.navigate(['../archive', dest], {
      relativeTo: this.route,
      queryParams: { linkedTaskId: t.id, subjectId: t.subjectId }
    });
  }


  // ==== Actions (Head) ====
  async approveTask(t: ExamTask) {
    const cfm = await Swal.fire({
      icon: 'question',
      title: 'Duyệt hoàn thành?',
      html: `Duyệt bài nộp của nhiệm vụ:<br><b>${t.title}</b>`,
      showCancelButton: true,
      confirmButtonText: 'Duyệt',
      cancelButtonText: 'Không'
    });
    if (!cfm.isConfirmed) return;

    this.isLoading = true;
    this.api.approve(t.id).subscribe({
      next: (u) => {
        this.updateRow(u);
        this.showSuccess('Đã duyệt hoàn thành');
      },
      error: err => {
        console.error(err);
        this.showError(err?.error?.message ?? 'Duyệt thất bại');
      },
      complete: () => this.isLoading = false
    });
  }

  private updateRow(u: ExamTask) {
    this.rows = this.rows.map(r => r.id === u.id ? u : r);
  }

  // ===== Helpers kiểm tra quyền / trạng thái =====
  canStart(t: ExamTask) {
    // KHÔNG cho start khi REPORTED (chỉ còn Thu hồi báo lỗi)
    return this.isTeacher && t.status === 'ASSIGNED';
  }

  canRevokeReport(t: ExamTask) {
    return this.isTeacher && t.status === 'REPORTED';
  }

  canSubmit(t: ExamTask) {
    if (!this.isTeacher) return false;
    if (['CANCELLED', 'DONE'].includes(t.status)) return false;
    // Cho nộp từ: ASSIGNED, IN_PROGRESS, REPORTED, SUBMITTED (nộp lại), RETURNED (nộp lại)
    return ['ASSIGNED', 'IN_PROGRESS', 'REPORTED', 'SUBMITTED', 'RETURNED'].includes(t.status);
  }

  canCancel(t: ExamTask) {
    return this.isHead && (t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS' || t.status === 'REPORTED');
  }

  canHeadApprove(t: ExamTask) {
    // Nếu muốn “nâng UX”, có thể thêm điều kiện !!t.submissionArchiveId
    return this.isHead && (t.status === 'SUBMITTED' || t.status === 'RETURNED');
  }

  canReport(t: ExamTask) {
    // Ẩn luôn khi đã REPORTED để chỉ còn nút Thu hồi báo lỗi
    return this.isTeacher && !['SUBMITTED', 'RETURNED', 'DONE', 'CANCELLED', 'REPORTED'].includes(t.status);
  }


  // ==== i18n status ====
  viStatus(s?: ExamTaskStatus | null) {
    switch (s) {
      case 'ASSIGNED': return 'Đã giao';
      case 'IN_PROGRESS': return 'Đang làm';
      case 'REPORTED': return 'Báo lỗi';
      case 'RETURNED': return 'Bị từ chối';
      case 'SUBMITTED': return 'Đã nộp';
      case 'DONE': return 'Hoàn thành';
      case 'CANCELLED': return 'Đã huỷ';
      default: return '—';
    }
  }

  statusChip(s: ExamTaskStatus) {
    switch (s) {
      case 'ASSIGNED': return 'badge rounded-pill text-bg-warning';
      case 'IN_PROGRESS': return 'badge rounded-pill text-bg-info';
      case 'REPORTED': return 'badge rounded-pill text-bg-danger';
      case 'RETURNED': return 'badge rounded-pill text-bg-warning'; // hoặc danger-subtle tuỳ theme
      case 'SUBMITTED': return 'badge rounded-pill text-bg-primary';
      case 'DONE': return 'badge rounded-pill text-bg-success';
      case 'CANCELLED': return 'badge rounded-pill text-bg-secondary';
      default: return 'badge rounded-pill text-bg-secondary';
    }
  }

  revokeReport(t: ExamTask) {
    // Dùng start() để đưa về IN_PROGRESS theo BE
    this.isLoading = true;
    this.api.start(t.id).subscribe({
      next: (u) => { this.updateRow(u); this.showSuccess('Đã thu hồi báo lỗi'); },
      error: err => { console.error(err); this.showError(err?.error?.message ?? 'Không thể thu hồi'); },
      complete: () => this.isLoading = false
    });
  }

  async rejectTask(t: ExamTask) {
    const { value: reason } = await Swal.fire({
      icon: 'warning',
      title: 'Từ chối bài nộp?',
      input: 'textarea',
      inputPlaceholder: 'Lý do (không bắt buộc)…',
      showCancelButton: true,
      confirmButtonText: 'Từ chối',
      cancelButtonText: 'Huỷ',
      confirmButtonColor: '#d33'
    });
    if (reason === undefined) return;

    this.isLoading = true;
    this.api.returnForRevision(t.id, reason || '').subscribe({
      next: (u) => {
        this.updateRow(u);
        this.showSuccess('Đã từ chối và yêu cầu nộp lại');
      },
      error: err => {
        console.error(err);
        this.showError(err?.error?.message ?? 'Từ chối thất bại');
      },
      complete: () => this.isLoading = false
    });
  }

}
