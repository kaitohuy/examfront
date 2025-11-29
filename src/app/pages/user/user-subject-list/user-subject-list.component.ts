import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { sharedImports } from '../../../shared/shared-imports';
import { SubjectService } from '../../../services/subject.service';
import { SubjectWithTeachers } from '../../../models/subjectWithTeachers';
import { LoadingScreenComponent } from '../../loading-screen/loading-screen.component';
import { withLoading } from '../../../shared/with-loading';
import { AutoSettingKind } from '../../../models/autoGen';
import { AutoPaperSettingDialogComponent } from '../../admin/auto-paper-setting-dialog/auto-paper-setting-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-user-subject-list',
  standalone: true,
  imports: [...sharedImports, LoadingScreenComponent],
  templateUrl: './user-subject-list.component.html'
})
export class UserSubjectListComponent implements OnInit {
  subjects: SubjectWithTeachers[] = [];
  isLoading = true;
  searchText = '';

  // ----- sort giống head -----
  sortField: 'id' | 'name' | 'code' | '' = '';
  sortDirection: 'asc' | 'desc' | '' = '';
  sortIcons: Record<'id' | 'name' | 'code', string> = {
    id: 'bi bi-arrow-down-up',
    name: 'bi bi-arrow-down-up',
    code: 'bi bi-arrow-down-up',
  };

  constructor(
    private subjectSvc: SubjectService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.subjectSvc.getMySubjectsWithTeachers()
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: (data) => {
          this.subjects = Array.isArray(data) ? data : [];
        },
        error: () => { /* isLoading handled by withLoading */ }
      });
  }

  // ----- filter + sort -----
  get filteredSubjects(): SubjectWithTeachers[] {
    const t = (this.searchText || '').trim().toLowerCase();
    let list = this.subjects;

    if (t) {
      list = list.filter(s => {
        const name = (s.name || '').toLowerCase();
        const code = (s.code || '').toLowerCase();
        const teachersStr = (s.teachers || [])
          .map((x: any) =>
            `${x.firstName ?? ''} ${x.lastName ?? ''}`.toLowerCase()
          )
          .join(' ');
        return name.includes(t) || code.includes(t) || teachersStr.includes(t);
      });
    }

    // không sort -> trả trực tiếp
    if (!this.sortField || !this.sortDirection) return list;

    // sort theo field được chọn
    return [...list].sort((a: any, b: any) => {
      const A = (a[this.sortField] ?? '').toString().toLowerCase();
      const B = (b[this.sortField] ?? '').toString().toLowerCase();
      if (A < B) return this.sortDirection === 'asc' ? -1 : 1;
      if (A > B) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  sort(field: 'id' | 'name' | 'code'): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.updateSortIcons();
  }

  updateSortIcons(): void {
    this.sortIcons.id = 'bi bi-arrow-down-up';
    this.sortIcons.name = 'bi bi-arrow-down-up';
    this.sortIcons.code = 'bi bi-arrow-down-up';

    if (this.sortField && this.sortDirection) {
      this.sortIcons[this.sortField] =
        this.sortDirection === 'asc' ? 'bi bi-sort-down' : 'bi bi-sort-up';
    }
  }

  // ----- misc -----
  trackById(_: number, s: SubjectWithTeachers) { return s?.id; }

  openSubject(s: SubjectWithTeachers) {
    this.router.navigate(['/user-dashboard', 'subjects', s.id, 'exam']);
  }

  openSettingDialog(s: SubjectWithTeachers, e?: Event) {
    e?.stopPropagation();
    if (this.isLoading) return;

    const kind: AutoSettingKind = 'PRACTICE';

    const ref = this.dialog.open(AutoPaperSettingDialogComponent, {
      width: '1100px',
      data: {
        subjectId: Number(s.id),
        kind
      }
    });

    ref.afterClosed().subscribe(res => {
      if (res) {
        this.snackBar.open('Đã lưu cấu hình đề ÔN TẬP', 'Đóng', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      }
    });
  }
}
