import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { sharedImports } from '../../../shared/shared-imports';
import { PracticeQuestionTabComponent } from "../practice-question-tab/practice-question-tab.component";
import { ExamQuestionTabComponent } from "../exam-question-tab/exam-question-tab.component";
import { SubjectService } from '../../../services/subject.service';
import { switchMap } from 'rxjs';
import { LoginService } from '../../../services/login.service';
@Component({
  selector: 'app-subject-detail',
  standalone: true,
  imports: [
    ...sharedImports,
    PracticeQuestionTabComponent,
    ExamQuestionTabComponent
],
  templateUrl: './subject-detail.component.html',
  styleUrls: ['./subject-detail.component.css']
})

export class SubjectDetailComponent implements OnInit {
  departmentId!: number;
  subjectId!: number;
  subjectName: string | null = null;
  userRole: string | null | undefined;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private subjectService: SubjectService,
    public login: LoginService
  ) {}

   ngOnInit(): void {
    this.userRole = this.login.getUserRole();
    this.departmentId = +this.route.snapshot.paramMap.get('departmentId')!;
    this.subjectId = +this.route.snapshot.paramMap.get('subjectId')!;
    this.route.paramMap
      .pipe(
        switchMap(pm => {
          this.departmentId = +(pm.get('departmentId') || 0);
          this.subjectId = +(pm.get('subjectId') || 0);
          this.subjectName = null;
          return this.subjectService.getSubjectById(this.subjectId);
        })
      )
      .subscribe({
        next: (s: any) => {
          this.subjectName = s?.name ?? '';
        },
        error: () => {
          this.subjectName = '';
        }
      });
  }

  returnSubject(): void {
    if (this.userRole === 'ADMIN') {
      // Admin quay về danh sách môn của Khoa
      this.router.navigate(['/admin-dashboard', 'department', this.departmentId, 'subjects']);
    } else if (this.userRole === 'HEAD') {
      // Trưởng bộ môn quay về danh sách môn của Khoa (trong Dashboard HEAD)
      this.router.navigate(['/head-dashboard', 'department']);
    } else if (this.userRole === 'TEACHER') {
      // Giảng viên quay về danh sách môn học của mình
      this.router.navigate(['/user-dashboard', 'subjects']);
    } else {
      // Fallback mặc định
      this.router.navigate(['/']);
    }
  }
}