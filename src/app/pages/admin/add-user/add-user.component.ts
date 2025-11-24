import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of, switchMap, tap, startWith } from 'rxjs';

import { sharedImports } from '../../../shared/shared-imports';
import { UserService } from '../../../services/user.service';
import { DepartmentService } from '../../../services/department.service';
import { SubjectService } from '../../../services/subject.service';

import { withLoading } from '../../../shared/with-loading';
import { LoadingScreenComponent } from '../../loading-screen/loading-screen.component';
import { LoginService } from '../../../services/login.service';

type RoleType = 'ADMIN' | 'HEAD' | 'TEACHER' | null;
interface Dept { id: number; name: string; description?: string }
interface Subj { id: number; name: string; code: string }

@Component({
  selector: 'app-add-user',
  standalone: true,
  imports: [...sharedImports, ReactiveFormsModule, LoadingScreenComponent],
  templateUrl: './add-user.component.html',
  styleUrl: './add-user.component.css',
})
export class AddUserComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userSvc = inject(UserService);
  private deptSvc = inject(DepartmentService);
  private subjSvc = inject(SubjectService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  private login = inject(LoginService);
  private usernameTouchedByAdmin = false;
  private emailTouchedByAdmin = false;
  private passwordTouchedByAdmin = false;

  role: RoleType = null;
  isLoading = false;
  hide = true;

  departments: Dept[] = [];
  subjectsInDept: Subj[] = [];

  departmentText = new FormControl<string>('', { nonNullable: true });
  filteredDepartments: Dept[] = [];

  subjectFilter = new FormControl<string>('', { nonNullable: true });
  filteredSubjects: Subj[] = [];
  private subjNameMap = new Map<number, string>();

  form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(4)]],
    teacherCode: ['', Validators.required],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.email]],
    phone: ['', [Validators.pattern(/^(0|\+84)\d{9,10}$/)]],
    role: [null as RoleType | null],
    departmentId: [null as number | null],
    subjectIds: [[] as number[]],
  });

  ngOnInit(): void {
    this.role = this.login.getUserRole();
    // Load departments
    this.deptSvc.getAllDepartment().pipe(
      withLoading(v => this.isLoading = v)
    ).subscribe({
      next: (ds) => {
        this.departments = ds ?? [];
        this.filteredDepartments = this.departments;
      },
      error: () => this.snack.open('Không tải được danh sách bộ môn', 'Đóng', {
        duration: 2500,
        verticalPosition: 'top',
        horizontalPosition: 'right',
        panelClass: ['snack', 'snack-error']
      }),
    });

    // Filter departments by text
    this.departmentText.valueChanges.pipe(startWith(this.departmentText.value)).subscribe(q => {
      const s = (q || '').toLowerCase().trim();
      this.filteredDepartments = !s
        ? this.departments
        : this.departments.filter(d =>
          d.name.toLowerCase().includes(s) ||
          String(d.id).includes(s) ||
          (d.description || '').toLowerCase().includes(s)
        );
    });

    // Filter subjects by text
    this.subjectFilter.valueChanges.pipe(startWith(this.subjectFilter.value)).subscribe(q => {
      const s = (q || '').toLowerCase().trim();
      const base = this.subjectsInDept;
      this.filteredSubjects = !s
        ? base
        : base.filter(x =>
          x.name.toLowerCase().includes(s) ||
          x.code.toLowerCase().includes(s) ||
          String(x.id).includes(s)
        );
    });

    // When department changes -> load subjects
    this.form.get('departmentId')!.valueChanges.subscribe(deptId => {
      this.form.get('subjectIds')!.setValue([]);
      this.subjectFilter.setValue('');
      this.subjectsInDept = [];
      this.filteredSubjects = [];
      this.subjNameMap.clear();

      if (!deptId) return;

      this.subjSvc.getSubjectsByDepartment(Number(deptId)).pipe(
        withLoading(v => this.isLoading = v)
      ).subscribe({
        next: (list) => {
          this.subjectsInDept = list ?? [];
          this.filteredSubjects = this.subjectsInDept;
          this.rebuildSubjMap();
        },
        error: () => this.snack.open('Không tải được danh sách môn học', 'Đóng', {
          verticalPosition: 'top',
          horizontalPosition: 'right',
          panelClass: ['snack', 'snack-error'],
          duration: 2500
        }),
      });
    });

    // Role constraints
    this.form.get('role')!.valueChanges.subscribe(r => {
      const deptCtrl = this.form.get('departmentId')!;
      if (r === 'HEAD') deptCtrl.addValidators(Validators.required);
      else deptCtrl.removeValidators(Validators.required);
      deptCtrl.updateValueAndValidity({ emitEvent: false });

      if (r !== 'TEACHER') this.form.get('subjectIds')!.setValue([]);
    });

    // Đánh dấu admin đã sửa tay username/email/password
    this.form.get('username')!.valueChanges.subscribe(() => {
      this.usernameTouchedByAdmin = true;
    });
    this.form.get('email')!.valueChanges.subscribe(() => {
      this.emailTouchedByAdmin = true;
    });
    this.form.get('password')!.valueChanges.subscribe(() => {
      this.passwordTouchedByAdmin = true;
    });

    // Khi họ tên đổi => auto suggest
    const firstCtrl = this.form.get('firstName')!;
    const lastCtrl = this.form.get('lastName')!;

    firstCtrl.valueChanges.subscribe(() => this.autoFillAccountFields());
    lastCtrl.valueChanges.subscribe(() => this.autoFillAccountFields());
  }

  private rebuildSubjMap() {
    this.subjNameMap.clear();
    for (const s of this.subjectsInDept) this.subjNameMap.set(s.id, s.name);
  }
  subjectNameById(id: number) { return this.subjNameMap.get(id) ?? ('#' + id); }

  subjectIdsSafe(): number[] {
    const v = this.form.value.subjectIds;
    return Array.isArray(v) ? v.map(Number).filter(Number.isFinite) : [];
  }
  subjectsDisabled(): boolean {
    const r = this.form.value.role;
    const deptPicked = this.form.value.departmentId != null;
    return r !== 'TEACHER' || !deptPicked;
  }
  subjectsTriggerText(): string {
    const ids = this.subjectIdsSafe();
    if (!ids.length) return '';
    return ids.map((id) => this.subjectNameById(id)).join(', ');
  }

  selectDepartment(d: Dept) {
    this.departmentText.setValue(`${d.name}`);
    this.form.get('departmentId')!.setValue(d.id);
  }
  syncDeptControlOnBlur() {
    const txt = (this.departmentText.value || '').trim().toLowerCase();
    if (!txt) { this.form.get('departmentId')!.setValue(null); return; }
    const byId = this.departments.find(d => String(d.id) === txt);
    if (byId) { this.selectDepartment(byId); return; }
    const byName = this.departments.filter(d => d.name.toLowerCase() === txt);
    if (byName.length === 1) this.selectDepartment(byName[0]);
  }

  isSubjectSelected(id: number) { return this.subjectIdsSafe().includes(id); }
  toggleSubject(id: number, checked: boolean) {
    const cur = this.subjectIdsSafe();
    const next = checked ? Array.from(new Set([...cur, id])) : cur.filter(x => x !== id);
    this.form.get('subjectIds')!.setValue(next);
  }

  goBackByRole(): void {
    const role = this.role;
    if (role === 'ADMIN') this.router.navigate(['/admin-dashboard/user-management']);
    else this.router.navigate(['/head-dashboard/user-management']);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Vui lòng nhập đủ thông tin bắt buộc', 'Đóng', {
        duration: 2500,
        verticalPosition: 'top',
        horizontalPosition: 'right',
        panelClass: ['snack', 'snack-error']
      });
      return;
    }

    const raw = this.form.getRawValue();
    const rolePicked = raw.role as RoleType | null;
    const departmentId = raw.departmentId != null ? Number(raw.departmentId) : null;
    const subjectIds = this.subjectIdsSafe();

    if (subjectIds.length > 0 && !departmentId) {
      this.snack.open('Hãy chọn Bộ môn trước khi phân công môn dạy', 'Đóng', {
        duration: 2500,
        verticalPosition: 'top',
        horizontalPosition: 'right',
        panelClass: ['snack', 'snack-error']
      });
      return;
    }

    const rolesToSend: RoleType[] =
      rolePicked === 'TEACHER' ? ['TEACHER']
        : rolePicked ? [rolePicked, 'TEACHER']
          : [];

    this.userSvc.addUser({
      username: raw.username!,
      password: raw.password!,
      teacherCode: raw.teacherCode!,
      firstName: raw.firstName!,
      lastName: raw.lastName!,
      email: raw.email || undefined,
      phone: raw.phone || undefined,
    }).pipe(
      withLoading(v => this.isLoading = v),
      switchMap((created: any) => {
        const userId = created?.id;
        if (!userId) return of(created);

        const ops: any[] = [];

        if (rolesToSend.length) {
          ops.push(this.userSvc.updateRoles(Number(userId), rolesToSend as string[]));
        }

        if (rolePicked === 'TEACHER' && subjectIds.length) {
          for (const sid of subjectIds) {
            ops.push(this.subjSvc.assignTeacher(Number(sid), Number(userId)));
          }
        }

        if (rolePicked === 'HEAD' && departmentId) {
          ops.push(
            this.deptSvc.getDepartment(Number(departmentId)).pipe(
              switchMap((dept: any) =>
                this.deptSvc.updateDepartment(Number(departmentId), {
                  ...dept,
                  headUser: { id: Number(userId) },
                })
              )
            )
          );
        }

        return ops.length ? forkJoin(ops).pipe(tap(() => created)) : of(created);
      })
    ).subscribe({
      next: () => {
        this.snack.open('Tạo người dùng thành công', 'Đóng', {
          duration: 2500,
          verticalPosition: 'top',
          horizontalPosition: 'right',
          panelClass: ['snack', 'snack-success']
        });
        this.goBackByRole();
      },
      error: (err) => {
        console.error(err);
        this.snack.open('Tạo người dùng thất bại', 'Đóng', {
          duration: 3000,
          verticalPosition: 'top',
          horizontalPosition: 'right',
          panelClass: ['snack', 'snack-error']
        });
      },
    });
  }

  cancel() {
    this.goBackByRole();
  }

  // Loại bỏ dấu tiếng Việt, bỏ ký tự không phải a-z0-9
  private normalize(str: string): string {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // xóa dấu
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')    // chỉ giữ chữ/số, chống ký tự lạ
      .trim();
  }

  // Lấy chữ cái đầu mỗi từ
  private initialsOfWords(str: string): string {
    return this.normalize(str)
      .split(/\s+/)
      .filter(x => x.length > 0)
      .map(x => x[0])
      .join('');
  }

  // Gợi ý username kiểu firstName + initials(lastName)
  private buildSuggestedUsername(firstName: string, lastName: string): string {
    const first = this.normalize(firstName).replace(/\s+/g, '');
    const lastInit = this.initialsOfWords(lastName);
    return (first + lastInit);
  }

  private autoFillAccountFields() {
    const firstName = this.form.get('firstName')!.value || '';
    const lastName = this.form.get('lastName')!.value || '';

    if (!firstName || !lastName) return;

    const suggestedUser = this.buildSuggestedUsername(firstName, lastName);

    // username
    if (!this.usernameTouchedByAdmin) {
      this.form.get('username')!.setValue(suggestedUser, { emitEvent: false });
    }

    // email
    if (!this.emailTouchedByAdmin) {
      const emailVal = suggestedUser + '@ptit.edu.vn';
      this.form.get('email')!.setValue(emailVal, { emitEvent: false });
    }

    // password
    if (!this.passwordTouchedByAdmin) {
      this.form.get('password')!.setValue('12345678', { emitEvent: false });
    }
  }
}
