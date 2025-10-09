// models/exam-task.ts
export type ExamTaskStatus =
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'REPORTED'
  | 'SUBMITTED'
  | 'DONE'
  | 'CANCELLED'
  | 'RETURNED';

export interface ExamTask {
  id: number;
  subjectId: number;
  headDepartmentId: number;
  assignedToId: number;
  createdByHeadId: number;
  title: string;
  instructions?: string | null;
  structureJson: string;
  status: ExamTaskStatus;
  dueAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  // NEW (tuỳ dùng để hiển thị)
  submittedAt?: string | null;
  reportedAt?: string | null;
  submissionNote?: string | null;
  submissionArchiveId?: number | null;

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
  structureJson: string;
  dueAt?: string | null;
}

export interface ExamTaskUpdateStatusDTO {
  status: 'ASSIGNED' | 'IN_PROGRESS'; // chỉ còn dùng cho start (nếu muốn)
}
