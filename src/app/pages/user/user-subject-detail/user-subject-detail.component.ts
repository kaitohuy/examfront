import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { sharedImports } from '../../../shared/shared-imports';
import { QuizComponent } from '../../admin/quiz/quiz.component';
import { PracticeQuestionTabComponent } from '../../admin/practice-question-tab/practice-question-tab.component';
import { ExamQuestionTabComponent } from '../../admin/exam-question-tab/exam-question-tab.component';
import { SubjectService } from '../../../services/subject.service';

@Component({
  selector: 'app-user-subject-detail',
  standalone: true,
  imports: [...sharedImports, QuizComponent, PracticeQuestionTabComponent, ExamQuestionTabComponent],
  templateUrl: './user-subject-detail.component.html'
})
export class UserSubjectDetailComponent implements OnInit {
  subjectId!: number;
  departmentId!: number;
  ready = false;
  selectedIndex = 0; // quiz=0, practice=1, exam=2

  constructor(private route: ActivatedRoute, private router: Router, private subjectSvc: SubjectService) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(pm => {
      this.subjectId = +(pm.get('subjectId') || 0);
      const tab = (pm.get('tab') as 'quiz'|'practice'|'exam') || 'quiz';
      this.selectedIndex = tab === 'quiz' ? 0 : tab === 'practice' ? 1 : 2;

      this.ready = false;
      this.subjectSvc.getSubjectMetaById(this.subjectId).subscribe({
        next: meta => { this.departmentId = meta.departmentId!; this.ready = true; },
        error: () => this.router.navigate(['/user-dashboard','subjects'])
      });
    });
  }

  onTabChange(i: number) {
    const next = i === 0 ? 'quiz' : i === 1 ? 'practice' : 'exam';
    this.router.navigate(['/user-dashboard','subjects', this.subjectId]);
  }
}
