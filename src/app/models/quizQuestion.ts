import { Question } from "./question";

export interface QuizQuestion {
  id: number;
  orderIndex: number;
  question: Question;
}