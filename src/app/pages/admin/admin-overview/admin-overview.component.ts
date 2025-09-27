import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { sharedImports } from '../../../shared/shared-imports';
import { LoadingScreenComponent } from '../../loading-screen/loading-screen.component';
import { withLoading } from '../../../shared/with-loading';
import { StatsService } from '../../../services/stats.service';
import { AdminOverview } from '../../../models/admin-overview';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [...sharedImports, LoadingScreenComponent],
  templateUrl: './admin-overview.component.html',
  styleUrls: ['./admin-overview.component.css']
})
export class AdminOverviewComponent implements OnInit {
  isLoading = false;
  data?: AdminOverview;

  from = new FormControl<Date | null>(null);
  to = new FormControl<Date | null>(null);

  readonly typeItems = [
    { key: 'MULTIPLE_CHOICE' as const, label: 'Trắc nghiệm' },
    { key: 'ESSAY' as const, label: 'Tự luận' }
  ];

  readonly labelItems = [
    { key: 'PRACTICE' as const, label: 'Ôn tập' },
    { key: 'EXAM' as const, label: 'Thi cử' }
  ];

  ngOnInit(): void { this.reload(); }

  constructor(private api: StatsService, private snack: MatSnackBar) { }

  reload() {
    this.api.adminOverview(this.from.value, this.to.value)
      .pipe(withLoading(v => this.isLoading = v))
      .subscribe({
        next: d => this.data = d,
        error: err => this.snack.open('Không tải được số liệu.', 'Đóng', { duration: 3000, panelClass: ['error-snackbar'] })
      });
  }

  clearRange() { this.from.setValue(null); this.to.setValue(null); this.reload(); }

  // quick presets
  thisWeek() {
    const now = new Date();
    const day = (now.getDay() + 6) % 7; // Mon=0
    const start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
    this.from.setValue(start); this.to.setValue(end); this.reload();
  }
  thisMonth() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    this.from.setValue(start); this.to.setValue(end); this.reload();
  }
  thisQuarter() {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), q * 3, 1);
    const end = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
    this.from.setValue(start); this.to.setValue(end); this.reload();
  }
  thisYear() {
    const start = new Date(new Date().getFullYear(), 0, 1);
    const end = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);
    this.from.setValue(start); this.to.setValue(end); this.reload();
  }

  v(obj?: Record<string, number>, key?: string): number { return obj?.[key!] ?? 0; }
  keys(o?: Record<string, number>): string[] { return Object.keys(o || {}); }

  pct(part: number, total?: number): number {
    const t = total ?? this.data?.questions.total ?? 0;
    if (!t) return 0;
    return (part / t) * 100;
  }
}
