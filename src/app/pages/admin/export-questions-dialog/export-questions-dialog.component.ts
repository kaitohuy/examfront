import { Component, Inject, OnInit, computed, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef, MatDialogActions, MatDialogContent } from '@angular/material/dialog';
import { ExportOptions, NhchtForm } from '../../../models/exportOptions';
import { sharedImports } from '../../../shared/shared-imports';

@Component({
  selector: 'app-export-questions-dialog',
  standalone: true,
  imports: [
    ...sharedImports,
    MatDialogActions,
    MatDialogContent
  ],
  templateUrl: './export-questions-dialog.component.html',
  styleUrls: ['./export-questions-dialog.component.css']
})
export class ExportQuestionsDialogComponent implements OnInit {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { selectedCount: number },
    private ref: MatDialogRef<ExportQuestionsDialogComponent>
  ) { }

  submitted = false;
  variant: 'practice' | 'exam' = 'practice';
  fileName = '';
  format: 'pdf' | 'docx' = 'pdf';
  includeAnswers = false;
  saveCopy = false;

  form: NhchtForm = 'TRAC_NGHIEM';
  level = 'Đại học chính quy';

  semester = '';
  academicYear = '';
  classes = '';
  durationMinutes: number | null = 90;
  paperNo: number | null = 1;
  examForm: 'viết' | 'trắc nghiệm' = 'viết';
  program = '';
  mau = '';

  ngOnInit(): void {
    this.applySmartDefaults();
  }

  clearFileName() { this.fileName = ''; }

  applySmartDefaults(now = new Date()) {
    if (!this.fileName) this.fileName = this.variant === 'exam' ? 'de-thi' : 'on-tap';

    if (this.variant === 'exam') {
      if (!this.semester || !this.academicYear) this.applySemesterDefault(now);
      if (!this.mau) this.mau = '3a';
    }
  }

  private applySemesterDefault(now = new Date()) {
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    if (month >= 1 && month <= 6) {
      this.semester = 'I';
      this.academicYear = `${year}-${year + 1}`;
    } else {
      this.semester = 'II';
      this.academicYear = `${year - 1}-${year}`;
    }
  }

  onSemesterChange() {
    const y = new Date().getFullYear();
    if (this.semester === 'I') this.academicYear = `${y}-${y + 1}`;
    else if (this.semester === 'II') this.academicYear = `${y - 1}-${y}`;
    else this.academicYear = '';
  }

  onVariantChange() {
    this.applySmartDefaults();
  }

  onCancel() {
    this.ref.close();
  }

  get canSubmit(): boolean {
    if (this.variant === 'exam') {
      const okClass = !!this.classes?.trim();
      const okFaculty = !!this.program?.trim();
      return okClass && okFaculty;
    }
    return true;
  }

  submit() {
    this.submitted = true;
    if (this.variant === 'exam') {
      const needClass = !this.classes?.trim();
      const needFaculty = !this.program?.trim();
      if (needClass || needFaculty) {
        setTimeout(() => {
          const firstInvalid = document.querySelector<HTMLInputElement>(
            needClass ? 'input[name="classes"]' : 'input[name="faculty"]'
          );
          firstInvalid?.focus();
        }, 0);
        return;
      }
    }
    const opts: ExportOptions = {
      format: this.format,
      includeAnswers: this.includeAnswers,
      variant: this.variant,
      fileName: this.fileName?.trim() || '',
      saveCopy: this.saveCopy
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
      opts.program = this.program?.trim() || undefined;
      opts.mau = 'Mẫu ' + (this.mau?.trim() || '');
    }

    this.ref.close(opts);
  }
}