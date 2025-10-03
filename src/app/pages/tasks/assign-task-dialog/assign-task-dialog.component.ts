import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { CommonModule } from '@angular/common';
import { debounceTime, startWith, switchMap } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { MatDatepicker } from '@angular/material/datepicker';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { VN_DATE_FORMATS } from '../../../models/dateFormats';
import { MatIconModule } from '@angular/material/icon';
import { SubjectService } from '../../../services/subject.service';
import { DepartmentService } from '../../../services/department.service';
import { LoginService } from '../../../services/login.service';
import { sharedImports } from '../../../shared/shared-imports';

interface SubjectWithTeachers {
  id: number;
  name: string;
  code: string;
  teachers?: { id: number; fullName?: string; firstName?: string; lastName?: string }[];
}

export interface AssignTaskDialogData {
  // cho phép preset subjectId nếu mở từ bộ lọc
  subjectId?: number | null;
}

@Component({
  selector: 'app-assign-task-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatAutocompleteModule, MatDatepickerModule,
    MatDatepickerModule, MatDatepicker,
    MatIconModule, 
    ...sharedImports,
  ],
   providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' },
    { provide: MAT_DATE_FORMATS, useValue: VN_DATE_FORMATS },
  ],
  templateUrl: './assign-task-dialog.component.html',
  styleUrls: ['./assign-task-dialog.component.css'],
})
export class AssignTaskDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private subjSvc = inject(SubjectService);
  private deptSvc = inject(DepartmentService);
  private login = inject(LoginService);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: AssignTaskDialogData,
    private dialogRef: MatDialogRef<AssignTaskDialogComponent>,
  ) {}

  isLoading = false;

  // danh sách môn (kèm teachers) giới hạn theo khoa của HEAD
  subjects: SubjectWithTeachers[] = [];
  filteredSubjects: SubjectWithTeachers[] = [];

  subjectText = new FormControl<string>('', { nonNullable: true });
  teachersForSubject: { id: number; name: string }[] = [];

  form = this.fb.group({
    subjectId: [null as number | null, Validators.required],
    assignedToId: [null as number | null, Validators.required],
    title: ['', [Validators.required, Validators.maxLength(160)]],
    instructions: [''],
    dueAt: [null as Date | null],
  });

  ngOnInit(): void {
  const me = this.login.getUser();

  this.isLoading = true;

  // 1) Lấy các khoa HEAD phụ trách → 2) forkJoin lấy list môn (kèm teachers) theo từng khoa
  this.deptSvc.getDepartmentsByHead(me?.id ?? 0).pipe(
    switchMap((depts: any[]) => {
      if (!Array.isArray(depts) || depts.length === 0) {
        return of([] as any[][]);
      }
      const calls = depts.map(d => this.subjSvc.getSubjectsByDepartment(d.id, true));
      return forkJoin(calls); // Observable<any[][]>
    })
  ).subscribe({
    next: (listOfLists: any[][]) => {
      // gộp & làm phẳng
      const flat = (listOfLists || []).flat() as SubjectWithTeachers[];
      const map = new Map<number, SubjectWithTeachers>();
      for (const s of flat) map.set(s.id, s);
      this.subjects = Array.from(map.values());
      this.filteredSubjects = this.subjects;

      // preset subject nếu có
      if (this.data?.subjectId) {
        const found = this.subjects.find(s => s.id === this.data!.subjectId);
        if (found) {
          this.form.controls.subjectId.setValue(found.id);
          this.subjectText.setValue(`${found.name} — ${found.code}`);
          this.updateTeachersFor(found);
        }
      }
    },
    error: _ => {},
    complete: () => this.isLoading = false
  });

  // filter môn theo text
  this.subjectText.valueChanges.pipe(
    startWith(this.subjectText.value),
    debounceTime(100),
  ).subscribe(q => {
    const s = (q || '').toLowerCase().trim();
    this.filteredSubjects = !s ? this.subjects : this.subjects.filter(x =>
      x.name.toLowerCase().includes(s) ||
      x.code.toLowerCase().includes(s) ||
      String(x.id).includes(s)
    );
  });

  // khi subjectId đổi → load teachers
  this.form.controls.subjectId.valueChanges.subscribe(id => {
    if (!id) {
      this.teachersForSubject = [];
      this.form.controls.assignedToId.setValue(null);
      return;
    }
    const found = this.subjects.find(s => s.id === id);
    if (found) {
      this.updateTeachersFor(found);
    } else {
      this.isLoading = true;
      this.subjSvc.getSubjectById(Number(id)).subscribe({
        next: (s) => this.updateTeachersFor(s as any),
        error: _ => {},
        complete: () => this.isLoading = false
      });
    }
  });
}


  displaySubject(s?: SubjectWithTeachers | null) { return s ? `${s.name} — ${s.code}` : ''; }

  onPickSubject(s: SubjectWithTeachers) {
    this.subjectText.setValue(this.displaySubject(s));
    this.form.controls.subjectId.setValue(s.id);
    this.updateTeachersFor(s);
  }

  syncSubjectOnBlur() {
    const txt = (this.subjectText.value || '').trim().toLowerCase();
    if (!txt) { this.form.controls.subjectId.setValue(null); return; }
    const exact = this.subjects.filter(s => `${s.name} — ${s.code}`.toLowerCase() === txt);
    if (exact.length === 1) {
      this.form.controls.subjectId.setValue(exact[0].id);
      this.updateTeachersFor(exact[0]);
    }
  }

  private updateTeachersFor(s: SubjectWithTeachers) {
    const list = (s.teachers || []).map(t => ({
      id: t.id,
      name: t.fullName || [t.lastName, t.firstName].filter(Boolean).join(' ') || `User #${t.id}`
    }));
    this.teachersForSubject = list;
    // nếu GV đã chọn không còn trong danh sách → reset
    const cur = this.form.controls.assignedToId.value;
    if (cur && !list.some(x => x.id === cur)) this.form.controls.assignedToId.setValue(null);
  }

  cancel() { this.dialogRef.close(); }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;
    this.dialogRef.close({
      subjectId: v.subjectId!,
      assignedToId: v.assignedToId!,
      title: v.title!.trim(),
      instructions: (v.instructions || '').trim() || null,
      dueAt: v.dueAt ? new Date(v.dueAt).toISOString() : null
    });
  }
}
