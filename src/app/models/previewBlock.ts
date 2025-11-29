import { Difficulty } from "./difficulty";
import { QuestionType } from "./questionType";

export interface PreviewBlock {
  index: number;
  questionType: QuestionType;
  difficulty: Difficulty;
  chapter: number | null;
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

   previewPrefix?: string;
  headerNo?: string;
  previewCode?: string;
  previewSubCodes?: string[];

  // NEW: clone info
  declaredCode?: string;
  cloneBaseCode?: string;
  cloneDesiredIndex?: number | null;
  cloneNextIndex?: number | null;
  clonePreviewCode?: string;
}