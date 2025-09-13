// src/app/pages/admin/subject-teachers.dialog/subject-teachers.dialog.component.ts
import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { sharedImports } from '../../../shared/shared-imports';
import { UserService } from '../../../services/user.service';
import { UserWithRolesAndDeptDTO } from '../../../models/user-dto';

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
  constructor(@Inject(MAT_DIALOG_DATA) public data: SubjectTeachersData) {}

  subject = this.data.subject;

  // UI state
  searchCtrl = new FormControl<string>('', { nonNullable: true });
  allTeachers: UserLite[] = [];
  filtered: UserLite[] = [];
  selected: UserLite[] = [];

  ngOnInit(): void {
    // ⬇️ Phòng thủ: nếu không có teachers thì lấy []
    const init = Array.isArray(this.subject?.teachers) ? this.subject!.teachers! : [];
    this.selected = init.map(t => ({ id: Number(t.id), firstName: t.firstName ?? '', lastName: t.lastName ?? '', teacherCode: t.teacherCode }));

    this.userSvc.getAllUsers().subscribe({
      next: (users: UserWithRolesAndDeptDTO[]) => {
        this.allTeachers = (users ?? [])
          .filter(u => (u.roles ?? []).includes('TEACHER'))
          .map(u => ({
            id: Number(u.id),
            firstName: u.firstName ?? '',
            lastName: u.lastName ?? '',
            teacherCode: u.teacherCode ?? undefined,
          }));
        this.filtered = this.allTeachers;
      },
    });

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

  toggleSelect(u: UserLite) {
    const exists = this.selected.some(x => x.id === u.id);
    this.selected = exists ? this.selected.filter(x => x.id !== u.id) : [...this.selected, u];
  }
  isSelected(u: UserLite) { return this.selected.some(x => x.id === u.id); }

  save()   { this.dialogRef.close(this.selected.map(u => ({ id: u.id }))); }
  cancel() { this.dialogRef.close(); }
}
