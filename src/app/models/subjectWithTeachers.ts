import { Subject } from "./subject";
import { User } from "./user";

export interface SubjectWithTeachers extends Subject {
  teachers: User[];
}