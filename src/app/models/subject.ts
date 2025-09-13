import { DepartmentDTO } from "./user-dto";

export interface Subject {
  id: number;
  name: string;
  code: string;
  departmentId: number;
  department?: DepartmentDTO | null;
}