// QuestionType bên BE là enum, FE mình thường map sang union string:
export type QuestionTypeBE = 'MULTIPLE_CHOICE' | 'ESSAY';

// Block dùng cho PREVIEW cập nhật đáp án
export interface AnswerUpdatePreviewBlockFE {
  /** Thứ tự block trong file (#1, #2...) */
  index: number;

  /** Raw text toàn block (để debug nếu cần) */
  raw: string;

  /** Mã loại câu hỏi trích từ header: "1.1", "2.2", "2.1.3"... */
  typeCode: string;

  /** Prefix đoán theo labels: "NH" hoặc "OT" */
  prefix: string;

  /** Mã gốc dạng OT2.2 / NH3.1.4 (prefix + typeCode) */
  baseCode: string;

  /** FE tick chọn block này để commit hay không */
  include: boolean;

  /** Đoán kiểu câu hỏi */
  questionType: QuestionTypeBE;

  /** Nếu là MCQ: đáp án (A, AB, ...) */
  mcAnswer: string | null;

  /** Nếu là tự luận nhiều ý: a -> ..., b -> ... */
  essayAnswers: Record<string, string>;

  /** Mapping sang DB: "a" -> questionId, hoặc "" cho câu đơn */
  targetQuestionIds: Record<string, number>;

  /** Đáp án hiện tại trong DB */
  currentAnswers: Record<string, string>;

  /** Đáp án mới sẽ cập nhật (đã normalize) */
  newAnswers: Record<string, string>;

  /** ít nhất 1 câu map được thì valid = true */
  valid: boolean;

  /** Cảnh báo (không lỗi cứng) */
  warnings: string[];
}

/** Response PREVIEW từ BE */
export interface AnswerImportPreviewResponse {
  sessionId: string;
  totalBlocks: number;
  blocks: AnswerUpdatePreviewBlockFE[];
}

/** Kết quả COMMIT từ BE */
export interface AnswerImportResult {
  /** số block được tick (include = true) */
  totalBlocks: number;

  /** số câu hỏi thực sự update thành công */
  totalQuestions: number;

  /** số mã không tìm thấy trong DB */
  notFound: number;

  /** các lỗi trong quá trình xử lý */
  errors: string[];
}
