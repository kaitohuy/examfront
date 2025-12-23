import { Difficulty } from "./difficulty";
import { QuestionType } from "./questionType";

export interface CreateQuestion {
  questionType: QuestionType;
  content: string;
  difficulty: Difficulty;
  chapter: number;

  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  answer?: string;
  answerText?: string;

  imageUrl?: string;
  labels?: ("PRACTICE" | "EXAM")[];

  typeCode?: string;
  itemNature?: string;

  /** 🔹 Loại bài / dạng toán */
  problemType?: string;
}

