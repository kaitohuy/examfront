// src/app/pages/admin/subject-teachers.dialog/subject-teachers.dialog.component.ts
import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { sharedImports } from '../../../shared/shared-imports';
import { UserService } from '../../../services/user.service';
import { UserWithRolesAndDeptDTO } from '../../../models/user-dto';
import { LoginService } from '../../../services/login.service';

type UserLite = { id: number; firstName: string; lastName: string; teacherCode?: string };

export interface SubjectTeachersData {
  subject: { id: number; name: string; teachers?: UserLite[] | null };
}

@Component({
  selector: 'app-subject-teachers-dialog',
  standalone: true,
  imports: [...sharedImports, ReactiveFormsModule, MatDialogContent, MatDialogActions],
  templateUrl: './subject-teachers.dialog.component.html',
  styleUrls: ['./subject-teachers.dialog.component.css'],
})
export class SubjectTeachersDialogComponent implements OnInit {
  private userSvc = inject(UserService);
  private dialogRef = inject(MatDialogRef<SubjectTeachersDialogComponent>);
  private loginSvc = inject(LoginService);     

  constructor(@Inject(MAT_DIALOG_DATA) public data: SubjectTeachersData) { }

  subject = this.data.subject;

  // UI state
  searchCtrl = new FormControl<string>('', { nonNullable: true });
  allTeachers: UserLite[] = [];
  filtered: UserLite[] = [];
  selected: UserLite[] = [];

  ngOnInit(): void {
    const init = Array.isArray(this.subject?.teachers) ? this.subject!.teachers! : [];
    this.selected = init.map(t => ({
      id: Number(t.id),
      firstName: t.firstName ?? '',
      lastName: t.lastName ?? '',
      teacherCode: t.teacherCode
    }));

    const role = this.loginSvc.getUserRole();

    if (role === 'HEAD') {
      this.loadForHead();
    } else if (role === 'ADMIN') {
      this.loadForAdmin();
    } else {
      this.loadForHead();
    }

    this.searchCtrl.valueChanges.subscribe(q => {
      const s = (q || '').toLowerCase().trim();
      this.filtered = !s
        ? this.allTeachers
        : this.allTeachers.filter(u =>
            (u.firstName || '').toLowerCase().includes(s) ||
            (u.lastName || '').toLowerCase().includes(s) ||
            (u.teacherCode || '').toLowerCase().includes(s) ||
            `${u.firstName} ${u.lastName}`.toLowerCase().includes(s)
          );
    });
  }

  // ====== LOAD DATA THEO ROLE ======

  /** HEAD: chỉ account có đúng 1 role = TEACHER */
  private loadForHead(): void {
    this.userSvc.getTeachersOnly().subscribe({
      next: (users: UserWithRolesAndDeptDTO[]) => {
        this.allTeachers = (users ?? [])
          .filter(u =>
            Array.isArray(u.roles) &&
            u.roles.length === 1 &&
            u.roles.includes('TEACHER')
          )
          .map(u => ({
            id: Number(u.id),
            firstName: u.firstName ?? '',
            lastName: u.lastName ?? '',
            teacherCode: u.teacherCode ?? undefined,
          }));
        this.filtered = this.allTeachers;
      }
    });
  }

  /** ADMIN: mọi user không có role ADMIN (role != ADMIN) */
  private loadForAdmin(): void {
    this.userSvc.getNonAdminUsers().subscribe({
      next: (users: UserWithRolesAndDeptDTO[]) => {
        this.allTeachers = (users ?? []).map(u => ({
          id: Number(u.id),
          firstName: u.firstName ?? '',
          lastName: u.lastName ?? '',
          teacherCode: u.teacherCode ?? undefined,
        }));
        this.filtered = this.allTeachers;
      }
    });
  }

  // ====== Chọn / lưu ======
  toggleSelect(u: UserLite) {
    const exists = this.selected.some(x => x.id === u.id);
    this.selected = exists ? this.selected.filter(x => x.id !== u.id) : [...this.selected, u];
  }
  isSelected(u: UserLite) { return this.selected.some(x => x.id === u.id); }

  save()   { this.dialogRef.close(this.selected.map(u => ({ id: u.id }))); }
  cancel() { this.dialogRef.close(); }
}
