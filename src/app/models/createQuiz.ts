import { AddQuizQuestion } from "./addQuizQuestion";

export interface CreateQuiz {
  title: string;
  description: string;
  maxScore: number;
  timeLimitMinutes: number;
  questions: AddQuizQuestion[];
}