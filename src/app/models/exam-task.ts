export type ExamTaskStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export interface ExamTask {
  id: number;
  subjectId: number;
  headDepartmentId: number;
  assignedToId: number;
  createdByHeadId: number;
  title: string;
  instructions?: string | null;
  structureJson: string;        // JSON string hoặc plain text
  status: ExamTaskStatus;
  dueAt?: string | null;        // ISO
  completedAt?: string | null;  // ISO
  createdAt: string;
  updatedAt: string;

  // server đã map sẵn tên hiển thị
  subjectName?: string;
  assignedToName?: string;
  createdByName?: string;
}

export interface ExamTaskCreateDTO {
  subjectId: number;
  assignedToId: number;
  title: string;
  instructions?: string | null;
  structureJson: string;   // cho phép text/JSON
  dueAt?: string | null;   // ISO
}

export interface ExamTaskUpdateStatusDTO {
  status: ExamTaskStatus;
}
