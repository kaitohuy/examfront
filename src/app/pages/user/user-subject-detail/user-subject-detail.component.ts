import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { sharedImports } from '../../../shared/shared-imports';
import { PracticeQuestionTabComponent } from '../../admin/practice-question-tab/practice-question-tab.component';
import { ExamQuestionTabComponent } from '../../admin/exam-question-tab/exam-question-tab.component';
import { SubjectService } from '../../../services/subject.service';

@Component({
  selector: 'app-user-subject-detail',
  standalone: true,
  imports: [
    ...sharedImports,
    PracticeQuestionTabComponent,
    ExamQuestionTabComponent
  ],
  templateUrl: './user-subject-detail.component.html'
})
export class UserSubjectDetailComponent implements OnInit {
  subjectId!: number;
  departmentId!: number;
  ready = false;

  subjectName: string | null = null;   // <-- thêm

  /** map tab <-> index */
  // GỢI Ý: vì tab 0 đang là “Ngân hàng đề thi” nên nên map 'exam' trước
  private readonly tabs = ['exam', 'practice'] as const;

  selectedIndex = 0;
  private lastLoadedSubjectId?: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private subjectSvc: SubjectService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(pm => {
      const sid = Number(pm.get('subjectId') || 0);
      const tabParam = (pm.get('tab') as 'exam' | 'practice') || 'exam';

      if (!Number.isFinite(sid) || sid <= 0) {
        this.router.navigate(['/user-dashboard', 'subjects']);
        return;
      }

      this.subjectId = sid;
      this.selectedIndex = this.indexFromTab(tabParam);

      if (this.lastLoadedSubjectId !== this.subjectId) {
        this.subjectName = null; 
        this.ready = false;

        this.subjectSvc.getSubjectMetaById(this.subjectId).subscribe({
          next: meta => {
            this.departmentId = meta.departmentId!;
            this.subjectName = meta.name ?? '';
            console.log('namer:', this.subjectName);
            this.ready = true;
            this.lastLoadedSubjectId = this.subjectId;
          },
          error: () => this.router.navigate(['/user-dashboard', 'subjects'])
        });
      } else {
        this.ready = true;
      }
    });
  }


  onTabChange(i: number) {
    const next = this.tabFromIndex(i);
    this.router.navigate(['/user-dashboard', 'subjects', this.subjectId, next]);
  }

  private tabFromIndex(i: number): 'exam' | 'practice' {
    return (this.tabs[i] ?? 'exam');
  }

  private indexFromTab(t: string): number {
    const idx = this.tabs.indexOf(t as any);
    return idx >= 0 ? idx : 0;
  }
}
