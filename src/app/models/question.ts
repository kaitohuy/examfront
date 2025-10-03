import { Difficulty } from "./difficulty";
import { QuestionType } from "./questionType";
import { User } from "./user";

export interface QuestionImageDTO {
  id: number;
  url: string;
  orderIndex: number;
}

export interface Question {
  id: number;
  questionType: QuestionType;
  content: string;
  difficulty: Difficulty;
  /** BE đôi khi trả null → để union cho an toàn */
  chapter: number | null;

  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  answer?: string;
  answerText?: string;
  imageUrl?: string;            
  images?: QuestionImageDTO[];   
  createdAt: string;
  createdBy?: User;
  labels?: ("PRACTICE" | "EXAM")[];
  parentId?: number | null; 
  cloneIndex?: number | null; 
  flagged?: boolean; 
}
