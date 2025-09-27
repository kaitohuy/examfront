import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

export type SnoozeChoice = 'none' | '1h' | '3h' | '24h' | 'forever';

export interface ReviewReminder {
  id: number;
  filename: string;
  subjectName?: string;
  reviewStatus?: 'APPROVED' | 'REJECTED' | 'PENDING' | null;
  reviewedAt?: string | null;
  reviewDeadline?: string | null;
  reviewedByName?: string | null;
  reviewNote?: string | null;
}

export interface ReviewReminderDialogData {
  approved: ReviewReminder[];
  deadlines: ReviewReminder[];
}

export interface ReviewReminderDialogResult {
  snooze: SnoozeChoice;
}

@Component({
  selector: 'app-review-reminder-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule
  ],
  templateUrl: './reminder-dialog.component.html',
  styleUrls: ['./reminder-dialog.component.css']
})
export class ReviewReminderDialogComponent {
  snooze: SnoozeChoice = 'none';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ReviewReminderDialogData,
    private ref: MatDialogRef<ReviewReminderDialogComponent, ReviewReminderDialogResult>
  ) {}

  viDate(iso?: string | null) {
    return iso ? new Date(iso).toLocaleString('vi-VN') : '';
  }

  close() { this.ref.close(); }
  confirm() { this.ref.close({ snooze: this.snooze }); }
}
