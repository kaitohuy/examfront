// +++ Thêm interface tuỳ chọn export
export type ExportVariant = 'practice' | 'exam';
export type ExportFormat  = 'pdf' | 'docx';
export type NhchtForm    = 'TU_LUAN' | 'TRAC_NGHIEM';

export interface ExportOptions {
  format: ExportFormat;
  includeAnswers: boolean;
  fileName: String;
  variant: ExportVariant;
  saveCopy?: boolean;

  // practice
  form?: NhchtForm;                 // TU_LUAN | TRAC_NGHIEM
  level?: string;                   // "Đại học chính quy", ...

  // exam
  semester?: string;                // "I" | "II" | "Hè" ...
  academicYear?: string;            // "2024-2025"
  classes?: string;                 // "D18CN, D18AT"
  durationMinutes?: number;         // chỉ nhập số phút
  paperNo?: number;                 // 1,2,...
  examForm?: 'Viết' | 'Trắc nghiệm' | string;
  faculty?: string;                 // Khoa
  mau?: string;                     // Nhãn "Mẫu 3a", ...
}
