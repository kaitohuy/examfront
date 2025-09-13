import { Component, Inject, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, Validators, FormControl } from '@angular/forms';

import { sharedImports } from '../../../shared/shared-imports';
import { UserService } from '../../../services/user.service';
import { UserWithRolesAndDeptDTO } from '../../../models/user-dto';

type UserLite = {
  id: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  teacherCode?: string | null;   // ⬅️ thêm code
  roles?: string[] | null;
};

export interface DepartmentUpsertData {
  mode: 'create' | 'edit';
  department?: {
    id: number;
    name: string;
    description?: string;
    headUser?: {
      id: number;
      firstName?: string | null;
      lastName?: string | null;
      username?: string | null;
      teacherCode?: string | null;
    };
  } | null;
}

@Component({
  selector: 'app-department-upsert-dialog',
  standalone: true,
  imports: [...sharedImports, ReactiveFormsModule, MatDialogContent, MatDialogActions],
  templateUrl: './department-upsert.dialog.component.html',
  styleUrls: ['./department-upsert.dialog.component.css'],
})
export class DepartmentUpsertDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userSvc = inject(UserService);
  private dialogRef = inject(MatDialogRef<DepartmentUpsertDialogComponent>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: DepartmentUpsertData) {}

  title = this.data?.mode === 'edit' ? 'Cập nhật bộ môn' : 'Thêm bộ môn mới';

  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    headUserId: [null as number | null],
  });

  headUserText = new FormControl<string>('', { nonNullable: true });
  allTeachers: UserLite[] = [];
  filteredTeachers: UserLite[] = [];
  loadingTeachers = false;

  ngOnInit(): void {
    // Prefill khi edit
    if (this.data?.department) {
      const d = this.data.department;
      this.form.patchValue({
        name: d.name ?? '',
        description: d.description ?? '',
        headUserId: d.headUser?.id ?? null,
      });
      if (d.headUser) this.headUserText.setValue(this.displayUser(d.headUser));
    }

    // Load TEACHER
    this.loadingTeachers = true;
    this.userSvc.getAllUsers().subscribe({
      next: (users: UserWithRolesAndDeptDTO[]) => {
        const list: UserLite[] = (users ?? [])
          .filter(u => Array.isArray(u.roles) && u.roles.includes('TEACHER'))
          .map(u => ({
            id: Number(u.id),
            username: u.username ?? '',
            firstName: u.firstName ?? '',
            lastName: u.lastName ?? '',
            teacherCode: u.teacherCode ?? '', // ⬅️ map code
            roles: u.roles ?? [],
          }));
        this.allTeachers = list;
        this.filteredTeachers = list;
        this.loadingTeachers = false;
      },
      error: () => { this.allTeachers = []; this.filteredTeachers = []; this.loadingTeachers = false; }
    });

    // Gõ để lọc: họ, tên, username, id, teacherCode
    this.headUserText.valueChanges.subscribe(q => {
      const s = (q || '').toLowerCase().trim();
      if (!s) { this.filteredTeachers = this.allTeachers; return; }
      this.filteredTeachers = this.allTeachers.filter(u => {
        const fn = (u.firstName ?? '').toLowerCase();
        const ln = (u.lastName ?? '').toLowerCase();
        const un = (u.username ?? '').toLowerCase();
        const tc = (u.teacherCode ?? '').toLowerCase();
        const full = `${fn} ${ln}`.trim();
        return fn.includes(s) || ln.includes(s) || un.includes(s) || full.includes(s)
            || String(u.id).includes(s) || tc.includes(s); // ⬅️ lọc theo code
      });
    });
  }

  displayUser(u: {firstName?: string | null; lastName?: string | null; username?: string | null; teacherCode?: string | null}): string {
    const full = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    // Ưu tiên hiển thị Họ Tên (CODE)
    const code = u.teacherCode ? ` (${u.teacherCode})` : '';
    return (full || (u.username ?? '') || '') + code;
  }

  selectHeadUser(u: UserLite) {
    this.form.get('headUserId')!.setValue(u?.id ?? null);
    this.headUserText.setValue(this.displayUser(u));
  }

  clearHeadUser() {
    this.form.get('headUserId')!.setValue(null);
    this.headUserText.setValue('');
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.getRawValue();
    const out = {
      name: (raw.name || '').trim(),
      description: (raw.description || '').trim(),
      headUser: raw.headUserId ? { id: Number(raw.headUserId) } : null
    };
    this.dialogRef.close(out);
  }

  cancel() { this.dialogRef.close(); }
}
