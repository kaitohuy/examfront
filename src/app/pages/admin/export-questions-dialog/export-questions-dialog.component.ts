import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ExportOptions, NhchtForm } from '../../../models/exportOptions';

@Component({
  selector: 'app-export-questions-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatCheckboxModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    CommonModule,
    MatFormFieldModule
  ],
  templateUrl: './export-questions-dialog.component.html',
  styleUrls: ['./export-questions-dialog.component.css']
})
export class ExportQuestionsDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { selectedCount: number },
    private ref: MatDialogRef<ExportQuestionsDialogComponent>
  ) {}

  variant: 'practice' | 'exam' = 'practice';
  fileName = '';
  format:  'pdf' | 'docx'      = 'pdf';
  includeAnswers = false;
  saveCopy = false; // chỉ áp dụng khi PRACTICE

  // practice
  form: NhchtForm = 'TRAC_NGHIEM';
  level = 'Đại học chính quy';

  // exam
  semester = '';
  academicYear = '';
  classes = '';
  durationMinutes: number | null = 90;
  paperNo: number | null = 1;
  examForm: 'viết' | 'trắc nghiệm' = 'viết';
  faculty = '';           // Bộ môn
  mau = '';               // "Mẫu 3a", ...

  get canSubmit(): boolean {
    return true;
  }

  submit() {
    const opts: ExportOptions = {
      format: this.format,
      includeAnswers: this.includeAnswers,
      variant: this.variant,
      fileName: this.fileName,
      // PRACTICE mới gửi saveCopy
      saveCopy: this.variant === 'practice' ? this.saveCopy : undefined
    };

    if (this.variant === 'practice') {
      opts.form = this.form;
      opts.level = this.level;
    } else {
      opts.semester = this.semester?.trim() || undefined;
      opts.academicYear = this.academicYear?.trim() || undefined;
      opts.classes = this.classes?.trim() || undefined;
      if (this.durationMinutes != null) opts.durationMinutes = this.durationMinutes;
      if (this.paperNo != null) opts.paperNo = this.paperNo;
      opts.examForm = 'hình thức thi ' + this.examForm;
      opts.faculty = this.faculty?.trim() || undefined;
      opts.mau = 'Mẫu ' + (this.mau?.trim() || '');
    }

    this.ref.close(opts);
  }
}
