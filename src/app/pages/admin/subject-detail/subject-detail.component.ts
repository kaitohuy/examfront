import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { sharedImports } from '../../../shared/shared-imports';
import { PracticeQuestionTabComponent } from "../practice-question-tab/practice-question-tab.component";
import { ExamQuestionTabComponent } from "../exam-question-tab/exam-question-tab.component";
import { SubjectService } from '../../../services/subject.service';
import { switchMap } from 'rxjs';
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private subjectService: SubjectService
  ) {}

   ngOnInit(): void {
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
}