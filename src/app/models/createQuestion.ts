import { Difficulty } from "./difficulty";
import { QuestionType } from "./questionType";

export interface CreateQuestion {
  questionType: QuestionType;
  content: string;
  difficulty: Difficulty;
  chapter: number;

  // Các field dưới tùy theo loại câu hỏi:
  // - MULTIPLE_CHOICE: optionA–D + answer
  // - ESSAY: answerText
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  answer?: string;
  answerText?: string;

  // Cover có thể để BE tự set từ ảnh upload → optional
  imageUrl?: string;

  /** 🔹 nhãn: nếu không truyền, BE mặc định PRACTICE */
  labels?: ("PRACTICE" | "EXAM")[];

  typeCode?: string;
  itemNature?: string;
}
