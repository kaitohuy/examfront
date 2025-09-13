import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { sharedImports } from '../../../shared/shared-imports';
import { SubjectService } from '../../../services/subject.service';
import { Subject as SubjectModel } from '../../../models/subject';

@Component({
  selector: 'app-user-subject-list',
  standalone: true,
  imports: [...sharedImports],
  templateUrl: './user-subject-list.component.html'
})
export class UserSubjectListComponent implements OnInit {
  subjects: SubjectModel[] = [];
  isLoading = true;
  searchText = '';

  constructor(private subjectSvc: SubjectService, private router: Router) {}

  ngOnInit(): void {
    this.subjectSvc.getMySubjects().subscribe({
      next: (data) => {
        this.subjects = Array.isArray(data) ? data : [];
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  get filtered(): SubjectModel[] {
    const t = (this.searchText || '').trim().toLowerCase();
    if (!t) return this.subjects;
    return this.subjects.filter(s => {
      const name = (s.name || '').toLowerCase();
      const code = (s.code || '').toLowerCase();
      return name.includes(t) || code.includes(t);
    });
  }

  trackById(_: number, s: SubjectModel) { return s?.id; }

  openSubject(s: SubjectModel) {
    this.router.navigate(['/user-dashboard', 'subjects', s.id, 'practice']);
  }
}
