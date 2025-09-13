import { Component, OnInit, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { debounceTime } from 'rxjs';
import { sharedImports } from '../../../shared/shared-imports';
import { LoadingScreenComponent } from '../../loading-screen/loading-screen.component';
import { VN_DATE_FORMATS } from '../../../models/dateFormats';
import { StatsService } from '../../../services/stats.service';
import { TeacherOverviewDto } from '../../../models/teacher-overview';

@Component({
  selector: 'app-teacher-overview',
  standalone: true,
  imports: [
    ...sharedImports,
    LoadingScreenComponent
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' },
    { provide: MAT_DATE_FORMATS, useValue: VN_DATE_FORMATS }
  ],
  templateUrl: './teacher-overview.component.html',
  styleUrls: ['./teacher-overview.component.css']
})
export class TeacherOverviewComponent implements OnInit {
  private api = inject(StatsService);

  // ======= State =======
  isLoading = false;
  data: TeacherOverviewDto | null = null;

  from = new FormControl<Date | null>(null);
  to   = new FormControl<Date | null>(null);

  ngOnInit(): void {
    // Auto reload khi đổi ngày (debounce nhẹ)
    this.from.valueChanges.pipe(debounceTime(150)).subscribe(() => this.load());
    this.to.valueChanges.pipe(debounceTime(150)).subscribe(() => this.load());
    this.load();
  }

  // ======= UI helpers =======
  get totalQuestions(): number {
    return this.data?.questions?.total ?? 0;
  }

  ymd(d?: Date | null) {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  barPercent(part: number | undefined | null, total: number): number {
    const p = Number(part ?? 0);
    const t = Math.max(1, Number(total ?? 0));
    const val = (p / t) * 100;
    return Math.max(0, Math.min(100, +val.toFixed(2)));
  }

  fmtHours(h: number | undefined | null) {
    const v = Number(h ?? 0);
    return `${v.toFixed(1)}h`;
  }

  asEntries<T extends Record<string, any>>(obj?: T) {
    return Object.entries(obj ?? {});
  }

  // ======= Quick ranges =======
  resetRange() {
    this.from.setValue(null);
    this.to.setValue(null);
    this.load();
  }
  thisWeek() {
    const now = new Date();
    const day = now.getDay();      // 0=CN
    const diffToMon = (day + 6) % 7;
    const start = new Date(now);
    start.setDate(now.getDate() - diffToMon);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7); // [start, end)
    this.from.setValue(start);
    this.to.setValue(new Date(end.getTime() - 1)); // hiển thị thuận mắt
  }
  thisMonth() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    this.from.setValue(start);
    this.to.setValue(new Date(end.getTime() - 1));
  }
  thisQuarter() {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3); // 0..3
    const start = new Date(now.getFullYear(), q * 3, 1);
    const end = new Date(now.getFullYear(), q * 3 + 3, 1);
    this.from.setValue(start);
    this.to.setValue(new Date(end.getTime() - 1));
  }
  thisYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear() + 1, 0, 1);
    this.from.setValue(start);
    this.to.setValue(new Date(end.getTime() - 1));
  }

  reload() { this.load(true); }

  // ======= Load data =======
  private load(force = false) {
    const from = this.ymd(this.from.value) || undefined;
    const to   = this.ymd(this.to.value)   || undefined;

    // StatsService.teacherOverview({ from, to, userId? })
    this.isLoading = true;
    this.api.teacherOverview({ from, to }).subscribe({
      next: (d) => { this.data = d as TeacherOverviewDto; },
      error: (e) => { console.error(e); },
      complete: () => { this.isLoading = false; }
    });
  }
}
