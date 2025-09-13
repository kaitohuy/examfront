import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { sharedImports } from '../../../shared/shared-imports';
import { PracticeQuestionTabComponent } from "../practice-question-tab/practice-question-tab.component";
import { ExamQuestionTabComponent } from "../exam-question-tab/exam-question-tab.component";
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

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.departmentId = +this.route.snapshot.paramMap.get('departmentId')!;
    this.subjectId = +this.route.snapshot.paramMap.get('subjectId')!;
  }
}