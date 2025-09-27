import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { sharedImports } from '../../../shared/shared-imports';
import { SubjectService } from '../../../services/subject.service';
import { SubjectWithTeachers } from '../../../models/subjectWithTeachers';
import { LoadingScreenComponent } from '../../loading-screen/loading-screen.component';
import { withLoading } from '../../../shared/with-loading';

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

  constructor(private subjectSvc: SubjectService, private router: Router) {}

  ngOnInit(): void {
    // gọi endpoint có kèm teachers
    this.subjectSvc.getMySubjectsWithTeachers()
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: (data) => {
          this.subjects = Array.isArray(data) ? data : [];
        },
        error: () => { /* isLoading handled by withLoading */ }
      });
  }

  get filtered(): SubjectWithTeachers[] {
    const t = (this.searchText || '').trim().toLowerCase();
    if (!t) return this.subjects;
    return this.subjects.filter(s => {
      const name = (s.name || '').toLowerCase();
      const code = (s.code || '').toLowerCase();
      const teachersStr = (s.teachers || [])
        .map((x: any) => `${x.firstName ?? ''} ${x.lastName ?? ''}`.toLowerCase())
        .join(' ');
      return name.includes(t) || code.includes(t) || teachersStr.includes(t);
    });
  }

  trackById(_: number, s: SubjectWithTeachers) { return s?.id; }

  openSubject(s: SubjectWithTeachers) {
    // Giữ route cũ
    this.router.navigate(['/user-dashboard', 'subjects', s.id, 'practice']);
  }
}
