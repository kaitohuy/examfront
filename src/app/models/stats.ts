export interface AdminStats {
  totalUsers: number;
  totalDepartments: number;
  totalTeachers: number;
  totalHeads: number;
}

export interface HeadDeptStats {
  subjectCount: number;
  teacherCount: number;
  unassignedSubjectCount: number;
}
