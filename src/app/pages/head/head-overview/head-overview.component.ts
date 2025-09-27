import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { sharedImports } from '../../../shared/shared-imports';
import { StatsService } from '../../../services/stats.service';
import { LoadingScreenComponent } from "../../loading-screen/loading-screen.component";

type TopSubject = { subjectId: number; subjectName: string; count: number };
type TopTeacher = { userId: number; teacherName: string; count: number };

@Component({
  selector: 'app-head-overview',
  standalone: true,
  imports: [...sharedImports, LoadingScreenComponent],
  templateUrl: './head-overview.component.html',
  styleUrls: ['./head-overview.component.css']
})
export class HeadOverviewComponent {
  // dùng trong template nếu cần
  math = Math;

  isLoading = false;

  from = new FormControl<Date | null>(null);
  to = new FormControl<Date | null>(null);

  // Cho gọn, nhận mọi field backend trả về (kể cả topSubjects/topTeachers)
  data: any;

  readonly typeItems = [
    { key: 'MULTIPLE_CHOICE' as const, label: 'Trắc nghiệm' },
    { key: 'ESSAY' as const, label: 'Tự luận' }
  ];

  readonly labelItems = [
    { key: 'PRACTICE' as const, label: 'Ôn tập' },
    { key: 'EXAM' as const, label: 'Thi cử' }
  ];

  constructor(private api: StatsService) {
    this.reload();
  }

  // ===== date helpers =====
  private fmt(d?: Date | null): string | undefined {
    if (!d) return undefined;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  resetRange() {
    this.from.setValue(null);
    this.to.setValue(null);
    this.reload();
  }

  quick(range: 'week' | 'month' | 'quarter' | 'year') {
    const now = new Date();
    let from = new Date(now);
    if (range === 'week') {
      const day = now.getDay() || 7; // 1..7, Monday-first
      from.setDate(now.getDate() - day + 1);
    }
    if (range === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1);
    if (range === 'quarter') {
      const qStart = Math.floor(now.getMonth() / 3) * 3;
      from = new Date(now.getFullYear(), qStart, 1);
    }
    if (range === 'year') from = new Date(now.getFullYear(), 0, 1);

    this.from.setValue(from);
    this.to.setValue(now);
    this.reload();
  }

  reload() {
    const f = this.fmt(this.from.value);
    const t = this.fmt(this.to.value);
    this.isLoading = true;
    this.api.getHeadOverview({ from: f, to: t }).subscribe({
      next: (d) => { this.data = d; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  // ===== UI helpers =====
  coveragePct(key: string): number {
    const total = this.data?.questions?.total || 0;
    const n = this.data?.coverage?.[key] || 0;
    if (!total) return 0;
    return n / total * 100;
  }

  get topSubjects(): TopSubject[] {
    return (this.data?.topSubjects as TopSubject[]) ?? [];
  }
  get topTeachers(): TopTeacher[] {
    return (this.data?.topTeachers as TopTeacher[]) ?? [];
  }

  get maxTopSubject(): number {
    const arr = this.topSubjects;
    return arr.length ? Math.max(...arr.map(x => x.count)) : 1;
  }
  get maxTopTeacher(): number {
    const arr = this.topTeachers;
    return arr.length ? Math.max(...arr.map(x => x.count)) : 1;
  }

  barPct(count: number, max: number): number {
    if (!max) return 0;
    return Math.min(100, Math.max(0, (count / max) * 100));
  }

  ofTotalPct(count: number): number {
    const total = this.data?.questions?.total || 0;
    if (!total) return 0;
    return (count / total) * 100;
  }

  trackById(_: number, it: { subjectId?: number; userId?: number }) {
    return it.subjectId ?? it.userId ?? _;
  }
}
