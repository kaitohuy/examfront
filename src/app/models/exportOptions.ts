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

  // New fields for Mapping
  level?: string;         // "Đại học", "Cao đẳng"
  trainingType?: string;  // "Chính quy", "Vừa làm vừa học"

  // practice
  form?: NhchtForm;
  
  // exam
  semester?: string;
  academicYear?: string;
  classes?: string;
  durationMinutes?: number;
  paperNo?: number;
  examForm?: 'Viết' | 'Trắc nghiệm' | string;
  faculty?: string;
  program?: string;
  mau?: string;
}
