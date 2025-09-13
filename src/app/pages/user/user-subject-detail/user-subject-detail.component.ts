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

  /** map tab <-> index */
  private readonly tabs = ['practice', 'exam'] as const;
  selectedIndex = 0;

  private lastLoadedSubjectId?: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private subjectSvc: SubjectService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(pm => {
      const sid = Number(pm.get('subjectId') || 0);
      const tabParam = (pm.get('tab') as 'practice' | 'exam') || 'practice';

      if (!Number.isFinite(sid) || sid <= 0) {
        // subjectId không hợp lệ -> quay về danh sách
        this.router.navigate(['/user-dashboard', 'subjects']);
        return;
      }

      this.subjectId = sid;
      this.selectedIndex = this.indexFromTab(tabParam);

      // Chỉ load meta nếu subjectId thay đổi
      if (this.lastLoadedSubjectId !== this.subjectId) {
        this.ready = false;
        this.subjectSvc.getSubjectMetaById(this.subjectId).subscribe({
          next: meta => {
            this.departmentId = meta.departmentId!;
            this.ready = true;
            this.lastLoadedSubjectId = this.subjectId;
          },
          error: () => this.router.navigate(['/user-dashboard', 'subjects'])
        });
      } else {
        // chỉ đổi tab, không cần gọi lại API
        this.ready = true;
      }
    });
  }

  onTabChange(i: number) {
    const next = this.tabFromIndex(i);
    // Điều hướng kèm segment tab để đồng bộ với paramMap.get('tab')
    this.router.navigate(['/user-dashboard', 'subjects', this.subjectId, next]);
  }

  private tabFromIndex(i: number):  'practice' | 'exam' {
    return (this.tabs[i] ?? 'practice');
  }

  private indexFromTab(t: string): number {
    const idx = this.tabs.indexOf((t as any));
    return idx >= 0 ? idx : 0;
  }
}
