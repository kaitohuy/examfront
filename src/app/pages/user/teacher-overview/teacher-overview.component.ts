// thêm vào nhóm import từ @angular/core
import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, inject, PLATFORM_ID } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { isPlatformBrowser, NgIf, NgFor } from '@angular/common';
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
    LoadingScreenComponent,
    NgIf,
    NgFor
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' },
    { provide: MAT_DATE_FORMATS, useValue: VN_DATE_FORMATS }
  ],
  templateUrl: './teacher-overview.component.html',
  styleUrls: ['./teacher-overview.component.css']
})
export class TeacherOverviewComponent implements OnInit, AfterViewInit, OnDestroy {
  private api = inject(StatsService);
  private platformId = inject(PLATFORM_ID);
  // ↑ không dùng PLATFORM_ID trực tiếp để giữ file gọn; Angular tự set đúng trong runtime.

  // ======= State =======
  isLoading = false;
  data: TeacherOverviewDto | null = null;

  from = new FormControl<Date | null>(null);
  to = new FormControl<Date | null>(null);

  // ======= Browser-only chart runtime =======
  private isBrowser = typeof window !== 'undefined' && isPlatformBrowser(this.platformId);
  private ApexCharts: any | null = null;

  // chart instances
  private charts: Record<string, any | null> = {
    archiveDonut: null,
    typeDonut: null,
    labelDonut: null,
    difficultyBar: null,
    coverageBar: null,
    contribHBar: null
  };

  // refs to hosts
  @ViewChild('archiveDonutRef') archiveDonutRef!: ElementRef<HTMLDivElement>;
  @ViewChild('typeDonutRef') typeDonutRef!: ElementRef<HTMLDivElement>;
  @ViewChild('labelDonutRef') labelDonutRef!: ElementRef<HTMLDivElement>;
  @ViewChild('difficultyRef') difficultyRef!: ElementRef<HTMLDivElement>;
  @ViewChild('coverageRef') coverageRef!: ElementRef<HTMLDivElement>;
  @ViewChild('contribRef') contribRef!: ElementRef<HTMLDivElement>;

  private viewReady = false;

  ngOnInit(): void {
    this.from.valueChanges.pipe(debounceTime(150)).subscribe(() => this.load());
    this.to.valueChanges.pipe(debounceTime(150)).subscribe(() => this.load());
    this.load();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    // nếu data đã có thì render ngay
    if (this.isBrowser && this.data) this.renderAllCharts();
  }

  ngOnDestroy(): void {
    // destroy instances
    for (const k of Object.keys(this.charts)) {
      try { this.charts[k]?.destroy?.(); } catch { }
      this.charts[k] = null;
    }
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
    this.to.setValue(new Date(end.getTime() - 1));
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
  private load(_force = false) {
    const from = this.ymd(this.from.value) || undefined;
    const to = this.ymd(this.to.value) || undefined;

    this.isLoading = true;
    this.api.teacherOverview({ from, to }).subscribe({
      next: (d) => {
        this.data = d as TeacherOverviewDto;
        if (this.isBrowser && this.viewReady) this.renderAllCharts();
      },
      error: (e) => { console.error(e); },
      complete: () => { this.isLoading = false; }
    });
  }

  // ======= Chart helpers (browser-only) =======
  private async ensureApex() {
    if (!this.isBrowser) return;
    if (!this.ApexCharts) {
      const mod = await import('apexcharts');
      this.ApexCharts = (mod as any).default ?? mod;
    }
  }

  private n(v: any) { return Number(v ?? 0); }

  private async upsertChart(el: ElementRef, key: keyof TeacherOverviewComponent['charts'], opts: any) {
    await this.ensureApex();
    if (!this.ApexCharts || !el?.nativeElement) return;

    // existing -> update
    if (this.charts[key]) {
      try {
        await this.charts[key].updateOptions({ ...opts, series: undefined }, false, true);
        if (opts.series) await this.charts[key].updateSeries(opts.series, true);
        return;
      } catch {
        try { this.charts[key].destroy(); } catch { }
        this.charts[key] = null;
      }
    }

    // create new
    this.charts[key] = new this.ApexCharts(el.nativeElement, opts);
    await this.charts[key].render();
  }

  private async renderAllCharts() {
    if (!this.data) return;

    // ====== Archive (pie đặc) ======
    const a = this.data.archive ?? {} as any;
    await this.upsertChart(this.archiveDonutRef, 'archiveDonut', {
      chart: {
        type: 'pie',
        height: 220,
        toolbar: { show: false },
        sparkline: { enabled: true },
        parentHeightOffset: 0
      },
      series: [this.n(a.approved), this.n(a.pending), this.n(a.rejected)],
      labels: ['APP', 'PEN', 'REJ'],
      legend: { show: false },
      colors: ['#22c55e', '#f59e0b', '#ef4444'],
      stroke: { width: 2, colors: ['#fff'] },
      dataLabels: {
        enabled: true,
        dropShadow: { enabled: false },
        offset: 0,
        formatter: (v: number) => v.toFixed(1) + '%',
        style: { fontWeight: 700 }
      },
      plotOptions: {
        pie: {
          offsetX: 0,
          offsetY: 0,
          expandOnClick: false,
          dataLabels: {
            offset: 0,
            minAngleToShowLabel: 5
          },
          customScale: 0.92
        }
      },
      grid: { padding: { top: 0, bottom: 0, left: 0, right: 0 } },
      noData: { text: '—' },
    });

    // ====== Câu hỏi của tôi ======
    const q = this.data.questions ?? {} as any;

    // (A) Pie "Theo loại" (hình tròn đặc, không legend để tiết kiệm chiều cao)
    await this.upsertChart(this.typeDonutRef, 'typeDonut', {
      chart: { type: 'pie', height: 180, toolbar: { show: false } },
      series: [this.n(q.byType?.['MULTIPLE_CHOICE']), this.n(q.byType?.['ESSAY'])],
      labels: ['Trắc nghiệm', 'Tự luận'],
      legend: { show: false },
      dataLabels: { enabled: true, formatter: (v: any) => v.toFixed(0) + '%' },
      colors: ['#3b82f6', '#6366f1'],
      stroke: { width: 2, colors: ['#fff'] },
      noData: { text: '—' }
    });

    // (B) Pie "Theo nhãn" (hình tròn đặc, không legend)
    await this.upsertChart(this.labelDonutRef, 'labelDonut', {
      chart: { type: 'pie', height: 180, toolbar: { show: false } },
      series: [this.n(q.byLabel?.['PRACTICE']), this.n(q.byLabel?.['EXAM'])],
      labels: ['Ôn tập', 'Thi cử'],
      legend: { show: false },
      dataLabels: { enabled: true, formatter: (v: any) => v.toFixed(0) + '%' },
      colors: ['#10b981', '#ef4444'],
      stroke: { width: 2, colors: ['#fff'] },
      noData: { text: '—' }
    });

    // (C) Radar "Theo độ khó" (đa dạng hoá)
    const diffKeys = ['A', 'B', 'C', 'D', 'E'];
    await this.upsertChart(this.difficultyRef, 'difficultyBar', {
      chart: { type: 'radar', height: 220, toolbar: { show: false } },
      series: [{ name: 'Câu hỏi', data: diffKeys.map(k => this.n(q.byDifficulty?.[k])) }],
      xaxis: { categories: diffKeys },
      yaxis: { show: false },
      dataLabels: { enabled: false },
      stroke: { width: 2 },
      fill: { opacity: 0.25 },
      markers: { size: 3 },
      colors: ['#3b82f6'],
      noData: { text: '—' }
    });

    // ====== Coverage (giữ nguyên bar) ======
    const chapters = Array.from({ length: 8 }, (_, i) => `CHAPTER${i}`);
    await this.upsertChart(this.coverageRef, 'coverageBar', {
      chart: { type: 'bar', height: 260, toolbar: { show: false } },
      series: [{ name: 'Câu hỏi', data: chapters.map((_, i) => this.n(this.data?.coverage?.[`chapter${i}`])) }],
      xaxis: { categories: chapters, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { min: 0, forceNiceScale: true, labels: { formatter: (v: any) => `${Math.round(Number(v))}` } },
      plotOptions: { bar: { columnWidth: '40%', borderRadius: 8 } },
      dataLabels: { enabled: false },
      grid: { strokeDashArray: 3 },
      colors: ['#06b6d4'],
      noData: { text: '—' }
    });

    // ====== Môn phụ trách: 100% stacked horizontal bar (Top 5) ======
    const s = this.data.subjects ?? {} as any;
    const top = (s.myContribTop ?? []).slice(0, 5);
    const cats = top.map((t: any) => t.subjectName);
    const mine = top.map((t: any) => this.n(t.myQuestions));
    const others = top.map((t: any) => Math.max(0, this.n(t.subjectTotal) - this.n(t.myQuestions)));

    await this.upsertChart(this.contribRef, 'contribHBar', {
      chart: { type: 'bar', height: Math.max(220, 56 + cats.length * 38), stacked: true, stackType: '100%', toolbar: { show: false } },
      series: [
        { name: 'Tôi', data: mine },
        { name: 'Khác', data: others }
      ],
      plotOptions: { bar: { horizontal: true, barHeight: '58%', borderRadius: 8 } },
      xaxis: {
        categories: cats,
        labels: { formatter: (v: any) => `${Math.round(Number(v))}%` }
      },
      legend: { position: 'bottom' },
      dataLabels: { enabled: false },
      grid: { strokeDashArray: 3 },   
      colors: ['#3b82f6', '#e5e7eb'],
      tooltip: {
        shared: true,
        intersect: false,   // <- BẮT BUỘC khi shared = true
        y: {
          formatter: (_val: any, opts: any) => {
            const i = opts.dataPointIndex;
            const total = mine[i] + others[i] || 1;
            const pct = Math.round((opts.seriesIndex === 0 ? mine[i] : others[i]) * 100 / total);
            return `${opts.w.globals.seriesNames[opts.seriesIndex]}: ${pct}% (${opts.series[opts.seriesIndex][i]})`;
          }
        }
      },
      noData: { text: '—' }
    });
  }

}
