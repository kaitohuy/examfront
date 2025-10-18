import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef, MatDialogActions, MatDialogContent } from '@angular/material/dialog';
import { ExportOptions, NhchtForm } from '../../../models/exportOptions';
import { sharedImports } from '../../../shared/shared-imports';

type Mode = 'export' | 'autogen';

@Component({
  selector: 'app-export-questions-dialog',
  standalone: true,
  imports: [
    ...sharedImports,
    MatDialogActions,
    MatDialogContent,
    MatDialogModule
  ],
  templateUrl: './export-questions-dialog.component.html',
  styleUrls: ['./export-questions-dialog.component.css']
})
export class ExportQuestionsDialogComponent implements OnInit {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { selectedCount: number, mode?: Mode },
    private ref: MatDialogRef<ExportQuestionsDialogComponent>
  ) { }

  // ===== shared =====
  mode: Mode = this.data.mode ?? 'export';
  submitted = false;

  // ===== export mode state (giữ nguyên) =====
  variant: 'practice' | 'exam' = 'exam';
  fileName = '';
  format: 'pdf' | 'docx' = 'docx';
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
  program = 'Công nghệ thông tin';
  mau = '3a';

  // ===== autogen mode =====
  variants: number = 5;   // số lượng đề

  ngOnInit(): void {
    this.applySmartDefaults();

    if (this.mode === 'autogen') {
      this.variant = 'exam';
      this.format = 'docx';
      this.fileName = this.fileName?.trim() || 'de_tu_dong';
      this.applySemesterDefault();
    }
  }

  clearFileName() { this.fileName = ''; }

  applySmartDefaults(now = new Date()) {
    if (this.mode === 'export') {
      if (!this.fileName) this.fileName = this.variant === 'exam' ? 'de-thi' : 'on-tap';
      if (this.variant === 'exam') {
        if (!this.semester || !this.academicYear) this.applySemesterDefault(now);
        if (!this.mau) this.mau = '3a';
      }
    }
  }

  private applySemesterDefault(now = new Date()) {
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    if (month >= 1 && month <= 6) {
      this.semester = 'II';
      this.academicYear = `${year - 1}-${year}`;
    } else {
      this.semester = 'I';
      this.academicYear = `${year}-${year + 1}`;
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

  onCancel() { this.ref.close(); }

  get canSubmit(): boolean {
    if (this.mode === 'autogen') {
      return !!this.variants && this.variants >= 1;
    }
    return true;
  }

  submit() {
    this.submitted = true;
    if (this.mode === 'autogen') {
      if (!this.canSubmit) return;

      const duration = this.durationMinutes != null ? `${this.durationMinutes} phút` : undefined;

      this.ref.close({
        mode: 'autogen',
        variants: this.variants,
        fileName: this.fileName?.trim() || 'de_tu_dong',
        variant: this.variant,
        format: this.format,

        // >>> THÊM DÒNG NÀY
        labels: this.variant === 'exam' ? ['EXAM'] : ['PRACTICE'],

        // header (optional)
        semester: this.semester?.trim() || undefined,
        academicYear: this.academicYear?.trim() || undefined,
        classes: this.classes?.trim() || undefined,
        duration,
        program: this.program?.trim() || undefined,
        examForm: this.examForm ? ('hình thức thi ' + this.examForm) : undefined,
        mau: this.mau?.trim() ? ('Mẫu ' + this.mau.trim()) : undefined
      });
      return;
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
      // chỉ gán nếu có giá trị (tránh chuỗi rỗng)
      const sem = this.semester?.trim();
      const ay = this.academicYear?.trim();
      const cls = this.classes?.trim();
      const prog = this.program?.trim();
      const mau = this.mau?.trim();

      if (sem) opts.semester = sem;
      if (ay) opts.academicYear = ay;
      if (cls) opts.classes = cls;
      if (this.durationMinutes != null) opts.durationMinutes = this.durationMinutes;
      if (this.paperNo != null) opts.paperNo = this.paperNo;
      // examForm/mẫu cũng để optional
      if (this.examForm) opts.examForm = 'hình thức thi ' + this.examForm;
      if (prog) opts.program = prog;
      if (mau) opts.mau = 'Mẫu ' + mau;
    }

    this.ref.close(opts);
  }
}
