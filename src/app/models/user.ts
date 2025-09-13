export interface User {
  id: number;
  teacherCode?: string | null;
  username: string;
  lastName?: string | null;
  firstName?: string | null;
  email?: string | null;
  phone?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED' | string;
  enabled: boolean;
  roles: string[]; // mảng chuỗi
}