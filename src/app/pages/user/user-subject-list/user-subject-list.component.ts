import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { sharedImports } from '../../../shared/shared-imports';
import { SubjectService } from '../../../services/subject.service';

@Component({
  selector: 'app-user-subject-list',
  standalone: true,
  imports: [...sharedImports],
  templateUrl: './user-subject-list.component.html'
})
export class UserSubjectListComponent implements OnInit {
  subjects: any[] = [];
  isLoading = true;
  searchText = '';

  constructor(private subjectSvc: SubjectService, private router: Router) {}

  ngOnInit(): void {
    this.subjectSvc.getMySubjects().subscribe({
      next: (data) => { this.subjects = data; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  get filtered(): any[] {
    const t = this.searchText.trim().toLowerCase();
    if (!t) return this.subjects;
    return this.subjects.filter(s => s.name.toLowerCase().includes(t) || s.code.toLowerCase().includes(t));
  }

  openSubject(s: any) {
    this.router.navigate(['/user-dashboard','subjects', s.id]);
  }
}
