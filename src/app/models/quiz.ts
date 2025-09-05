import { User } from "./user";

export interface Quiz {
  id: number;
  title: string;
  description: string;
  maxMarks: number,
  numberOfQuestions: number,
  active: boolean,
  createAt: string,
  createdBy: User
}