// Nếu muốn, có thể tách ra nhiều file; để nhanh mình để chung 1 file.

export type Status = 'ACTIVE' | 'INACTIVE' | 'LOCKED';
export type RoleType = 'ADMIN' | 'HEAD' | 'TEACHER' | 'NORMAL'; // bổ sung theo hệ thống của bạn
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';               // nếu BE có dùng

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
  headUser?: UserBasicDTO | null; // BE có headUser trong DepartmentDTO
}

export interface UserDTO {
  id: number;
  studentCode: string | null;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  gender?: Gender | null;
  birthDate?: string | null;     // BE là LocalDate -> FE nên để string (ISO)
  major?: string | null;
  className?: string | null;
  profile?: string | null;
  enabled: boolean;
  status: Status;                // ACTIVE/INACTIVE/LOCKED
}

export interface UserWithRolesDTO extends UserDTO {
  roles: RoleType[];             // Jackson serialize Set<RoleType> -> mảng string
}

export interface UserWithRolesAndDeptDTO extends UserWithRolesDTO {
  department?: DepartmentDTO | null;
}
