// Nếu muốn tách nhỏ, bạn có thể split theo domain. Để nhanh mình giữ 1 file.

export type Status = 'ACTIVE' | 'INACTIVE' | 'LOCKED';
export type RoleType = 'ADMIN' | 'HEAD' | 'TEACHER' | 'NORMAL';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface UserBasicDTO {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
}

export interface DepartmentDTO {
  id: number;
  name: string;
  description: string;
  headUser?: UserBasicDTO | null;
}

export interface UserDTO {
  id: number;
  teacherCode: string | null;  
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;

  gender?: Gender | null;
  birthDate?: string | null;
  profile?: string | null;
  enabled: boolean;
  status: Status;
}

export interface UserWithRolesDTO extends UserDTO {
  roles: RoleType[];
}

export interface UserWithRolesAndDeptDTO extends UserWithRolesDTO {
  department?: DepartmentDTO | null;
}

export type UserStored = UserWithRolesAndDeptDTO;
