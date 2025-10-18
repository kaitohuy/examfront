import { Difficulty } from "./difficulty";
import { QuestionType } from "./questionType";

export interface PreviewBlock {
  index: number;
  questionType: QuestionType;
  difficulty: Difficulty;
  chapter: number;
  content: string;
  optionA?: string; optionB?: string; optionC?: string; optionD?: string;
  answer?: string;  // for MC
  answerText?: string; // for Essay
  imageIndexes?: number[];
  warnings?: string[];
  labels?: ('PRACTICE' | 'EXAM')[];

  duplicateScore?: number;
  duplicateOfIds?: number[];

  duplicateBundleScore?: number;
  duplicateBundleIds?: number[];
}