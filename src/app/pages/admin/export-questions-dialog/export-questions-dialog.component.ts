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

  // ===== autogen mode =====
  variants: number = 5;   // số lượng đề

  ngOnInit(): void {
    this.applySmartDefaults();

    if (this.mode === 'autogen') {
      // auto chọn giá trị theo yêu cầu
      this.variant = 'exam';
      this.format = 'docx';
      this.fileName = this.fileName?.trim() || 'de_tu_dong';
      // “bao gồm đáp án” không dùng; “lưu kho” do BE autogen đã thực hiện.
      // preset kỳ-năm học “thông minh”
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

  onCancel() { this.ref.close(); }

  get canSubmit(): boolean {
    if (this.mode === 'export' && this.variant === 'exam') {
      // giữ validation cũ (bắt buộc lớp & bộ môn)
      const okClass = !!this.classes?.trim();
      const okFaculty = !!this.program?.trim();
      return okClass && okFaculty;
    }
    if (this.mode === 'autogen') {
      // chỉ cần số lượng hợp lệ
      return !!this.variants && this.variants >= 1;
    }
    return true;
  }

  submit() {
    this.submitted = true;

    // ===== AUTOGEN MODE: trả payload cho caller =====
    if (this.mode === 'autogen') {
      if (!this.canSubmit) return;

      // convert thời lượng phút -> chuỗi "X phút" cho BE autogen (/export)
      const duration = this.durationMinutes != null ? `${this.durationMinutes} phút` : undefined;

      this.ref.close({
        mode: 'autogen',
        variants: this.variants,
        fileName: this.fileName?.trim() || 'de_tu_dong',
        // vẫn trả lại type & format đang hiển thị (đã preset exam/docx)
        variant: this.variant,
        format: this.format,

        // header (không bắt buộc)
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

    // ===== EXPORT MODE: giữ logic cũ =====
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
