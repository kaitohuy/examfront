export type AppArea = 'ADMIN' | 'HEAD' | 'TEACHER';
export type NotificationTargetType = 'EXAM_TASK' | 'FILE_ARCHIVE' | 'QUESTION' | 'GENERIC';
export type NotificationAction =
  | 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'TASK_CANCELLED' | 'TASK_STARTED'
  | 'TASK_SUBMITTED' | 'TASK_APPROVED' | 'TASK_RETURNED' | 'TASK_REPORTED'
  | 'FILE_PENDING_REVIEW' | 'FILE_APPROVED' | 'FILE_REJECTED' | 'FILE_DELETED'
  | 'QUESTION_FLAGGED' | 'QUESTION_UNFLAGGED';

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message?: string;
  createdAt: string;   // ISO
  readAt?: string | null;
  isRead?: boolean;
  expiresAt?: string | null;

  // Hybrid deep-link
  action?: NotificationAction | null;
  targetType?: NotificationTargetType | null;
  targetId?: number | null;
  payload?: string | null;   // JSON string (chưa dùng)
  targetUrl?: string | null; // nếu BE đã resolve sẵn (chưa bắt buộc)
  appArea?: AppArea | null;
}
