import { Component, Inject, ViewChild, computed } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { VN_DATE_FORMATS } from '../../../models/dateFormats';

export type RejectPreset = 'none' | '4h' | '8h' | '24h' | '3d' | '7d' | 'custom';

export interface RejectDialogData {
  filename: string;
  subjectName?: string;
  subjectId?: number;
  uploaderName?: string;
}

export interface RejectDialogResult {
  reason: string;
  deadline?: string;
}

@Component({
  selector: 'app-reject-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatIconModule,
    MatDatepickerModule
  ],
  providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' },
    { provide: MAT_DATE_FORMATS, useValue: VN_DATE_FORMATS }
  ],
  templateUrl: './reject-dialog.component.html',
  styleUrls: ['./reject-dialog.component.css']
})
export class RejectDialogComponent {
  reason = new FormControl<string>('', { nonNullable: true });
  preset = new FormControl<RejectPreset>('none', { nonNullable: true });

  presetSig = toSignal(this.preset.valueChanges.pipe(startWith(this.preset.value)));
  showCustom = computed(() => this.presetSig() === 'custom');

  customValue = new FormControl<number | null>(null, { validators: [Validators.min(1)] });
  customUnit = new FormControl<'h' | 'd'>('d', { nonNullable: true });
  customDate = new FormControl<Date | null>(null);
  customHour = new FormControl<number | null>(null, { validators: [Validators.min(0), Validators.max(23)] });

  @ViewChild('dlPicker') dlPicker?: MatDatepicker<Date>;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: RejectDialogData,
    private ref: MatDialogRef<RejectDialogComponent, RejectDialogResult>,
    private snack: MatSnackBar
  ) { }

  private computeDeadline(
    preset: RejectPreset,
    n?: number | null,
    unit?: 'h' | 'd',
    date?: Date | null,
    hour?: number | null
  ): Date | null {
    const base = new Date();
    const add = (ms: number) => new Date(base.getTime() + ms);

    switch (preset) {
      case 'none': return null;
      case '4h': return add(4 * 60 * 60 * 1000);
      case '8h': return add(8 * 60 * 60 * 1000);
      case '24h': return add(24 * 60 * 60 * 1000);
      case '3d': return add(3 * 24 * 60 * 60 * 1000);
      case '7d': return add(7 * 24 * 60 * 60 * 1000);
      case 'custom':
        if (!date) return null;
        const d = new Date(date);
        d.setHours(hour ?? 23, 59, 59, 999);
        return d;
    }
    return null;
  }

  deadlinePreview = computed(() => {
    const d = this.computeDeadline(
      this.preset.value,
      this.customValue.value,
      this.customUnit.value,
      this.customDate.value,
      this.customHour.value
    );
    return d ? d.toLocaleString('vi-VN') : 'Không đặt hạn';
  });

  cancel() { this.ref.close(); }

  submit() {
    if (this.preset.value === 'custom' && !this.customDate.value) {
      this.customDate.markAsTouched();
      this.customDate.setErrors({ required: true });

      this.snack.open(
        'Vui lòng chọn ngày cho hạn xử lý.',
        'Đóng',
        { duration: 3000, verticalPosition: 'top', horizontalPosition: 'right', panelClass: ['snack', 'snack-error'] }
      );

      this.ref.close();
      return;
    }

    const d = this.computeDeadline(
      this.preset.value,
      this.customValue.value,
      this.customUnit.value,
      this.customDate.value,
      this.customHour.value
    );

    const toIso = (x: Date | null) => x ? x.toISOString() : undefined;
    const toYmd = (x: Date | null) => {
      if (!x) return undefined;
      const y = x.getFullYear();
      const m = String(x.getMonth() + 1).padStart(2, '0');
      const day = String(x.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    let deadline: string | undefined;
    if (this.preset.value === 'custom') {
      deadline = (this.customHour.value ?? null) !== null ? toIso(d) : toYmd(d);
    } else if (['4h', '8h', '24h'].includes(this.preset.value)) {
      deadline = toIso(d);
    } else if (['3d', '7d'].includes(this.preset.value)) {
      deadline = toYmd(d);
    } else {
      deadline = undefined;
    }

    this.ref.close({
      reason: (this.reason.value || '').trim(),
      deadline
    });
  }
}
