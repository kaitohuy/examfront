import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-screen.component.html',
  styleUrls: ['./loading-screen.component.css']
})
export class LoadingScreenComponent {
  @Input() title = 'Vui lòng đợi trong giây lát';
  @Input() subtitle = 'Đang chuyển hướng tới trang đích...';
  @Input() hintPrefix = 'Nếu phải chờ đợi quá lâu, bạn có thể';
  @Input() actionText = 'Reload lại trang nếu cần';
  @Input() blurBackground = true;
  @Input() showProgressBar = false;
  @Input() progress: number | null = null;

  // chế độ nhúng (dialog/card)
  @Input() embedded = false;

  @Output() action = new EventEmitter<void>();

  onActionClick(e: MouseEvent) {
    e.preventDefault();
    this.action.emit();
  }

  get safeProgress(): number {
    const p = this.progress ?? 0;
    return Math.max(0, Math.min(100, Math.floor(p)));
  }
}
