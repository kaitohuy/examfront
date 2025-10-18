import { Component, Inject, OnInit } from '@angular/core';
import { sharedImports } from '../../../shared/shared-imports';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogActions, MatDialogContent, MatDialogTitle, MatDialogClose } from '@angular/material/dialog';
import { LoadingScreenComponent } from "../../loading-screen/loading-screen.component";
import { FormControl, Validators } from '@angular/forms';
import { DepartmentService } from '../../../services/department.service';
import { SubjectService } from '../../../services/subject.service';
import { LoginService } from '../../../services/login.service';
import { of, startWith, switchMap } from 'rxjs';

export interface UploadAnswerDialogData {

}

export interface UploadAnswerDialogResult {
  file: File;
  subjectId: number;
}

interface SubjectOption {
  id: number;
  name: string;
  code: string;
  departmentName?: string;
}

@Component({
  selector: 'app-upload-answer-dialog',
  standalone: true,
  imports: [
    ...sharedImports,
    MatDialogActions,
    MatDialogContent,
    LoadingScreenComponent,
    MatDialogTitle,
    MatDialogClose
  ],
  templateUrl: './upload-answer-dialog.component.html',
  styleUrl: './upload-answer-dialog.component.css'
})
export class UploadAnswerDialogComponent implements OnInit {
  selectedFile: File | null = null;
  fileError: string | null = null;
  isDragging = false;
  loadingSubjects = false;

  subjectControl = new FormControl<number | null>(null, Validators.required);
  subjectFilterCtrl = new FormControl<string>('', { nonNullable: true });

  allSubjects: SubjectOption[] = [];
  filteredSubjects: SubjectOption[] = [];

  private currentRole: string | null = null;
  private currentUserId: number | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: UploadAnswerDialogData,
    public ref: MatDialogRef<UploadAnswerDialogComponent>,
    private subjectService: SubjectService,
    private deptService: DepartmentService,
    private loginService: LoginService
  ) { }

  ngOnInit() {
    this.currentRole = this.loginService.getUserRole();
    const user = this.loginService.getUser();
    this.currentUserId = user?.id ?? null;

    this.loadSubjects();

    // Filter subjects by search text
    this.subjectFilterCtrl.valueChanges.pipe(
      startWith('')
    ).subscribe(search => {
      const s = (search || '').toLowerCase().trim();
      this.filteredSubjects = !s
        ? this.allSubjects
        : this.allSubjects.filter(subj =>
          subj.name.toLowerCase().includes(s) ||
          subj.code.toLowerCase().includes(s) ||
          (subj.departmentName || '').toLowerCase().includes(s)
        );
    });
  }

  private loadSubjects() {
    this.loadingSubjects = true;
    this.ref.disableClose = true;
    if (this.currentRole === 'ADMIN') {
      // ADMIN không cần chức năng này theo yêu cầu
      // Nhưng nếu vẫn muốn cho phép, load all subjects:
      this.ref.close(); // Đóng dialog luôn vì ADMIN không dùng
      return;
    }

    if (this.currentRole === 'TEACHER') {
      // TEACHER: chỉ các môn đang dạy
      this.subjectService.getMySubjects().subscribe({
        next: (subjects) => {
          this.allSubjects = subjects.map(s => ({
            id: s.id,
            name: s.name || '',
            code: s.code || '',
            departmentName: s.department?.name
          }));
          this.filteredSubjects = [...this.allSubjects];
          this.loadingSubjects = false;
          this.ref.disableClose = false;
        },
        error: (err) => {
          console.error('Load subjects error:', err);
          this.loadingSubjects = false;
          this.ref.disableClose = false;
        }
      });
    } else if (this.currentRole === 'HEAD') {
      // HEAD: các môn trong department của mình
      if (!this.currentUserId) {
        this.loadingSubjects = false;
        return;
      }

      this.deptService.getDepartmentsByHead(this.currentUserId).pipe(
        switchMap(depts => {
          if (!depts || depts.length === 0) return of([]);
          // HEAD thường chỉ quản lý 1 department, lấy cái đầu
          const deptId = depts[0].id;
          return this.subjectService.getSubjectsByDepartment(deptId);
        })
      ).subscribe({
        next: (subjects) => {
          this.allSubjects = (subjects || []).map((s: any) => ({
            id: s.id,
            name: s.name || '',
            code: s.code || '',
            departmentName: s.department?.name
          }));
          this.filteredSubjects = [...this.allSubjects];
          this.loadingSubjects = false;
          this.ref.disableClose = false;
        },
        error: (err) => {
          console.error('Load subjects error:', err);
          this.loadingSubjects = false;
          this.ref.disableClose = false;
        }
      });
    }
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.validateAndSetFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer?.files?.length) {
      this.validateAndSetFile(event.dataTransfer.files[0]);
    }
  }

  private validateAndSetFile(file: File) {
    this.fileError = null;

    // Validate ZIP
    if (!file.name.toLowerCase().endsWith('.zip') &&
      !file.type.includes('zip')) {
      this.fileError = 'File phải là định dạng ZIP';
      return;
    }

    // Validate size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      this.fileError = 'File không được vượt quá 100MB';
      return;
    }

    if (file.size === 0) {
      this.fileError = 'File không được rỗng';
      return;
    }

    this.selectedFile = file;
  }

  clearFile() {
    this.selectedFile = null;
    this.fileError = null;
  }

  canSubmit(): boolean {
    return !!this.selectedFile &&
      !this.fileError &&
      this.subjectControl.valid &&
      !this.loadingSubjects;
  }

  submit() {
    if (!this.canSubmit()) return;

    const subjectId = this.subjectControl.value;
    if (!subjectId || !this.selectedFile) return;

    this.ref.close({
      file: this.selectedFile,
      subjectId
    } as UploadAnswerDialogResult);
  }

  humanSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let i = -1;
    let n = bytes;
    do { n /= 1024; i++; } while (n >= 1024 && i < units.length - 1);
    return `${n.toFixed(1)} ${units[i]}`;
  }
}