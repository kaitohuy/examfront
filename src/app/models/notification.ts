export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message?: string;
  createdAt: string;    
  readAt?: string | null;
  expiresAt?: string | null;
  isRead?: boolean;   
}
