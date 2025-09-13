import { User } from '../models/user';
import { UserWithRolesAndDeptDTO } from '../models/user-dto';

export function mapDtoToUser(u: UserWithRolesAndDeptDTO): User {
  return {
    id: u.id,
    teacherCode: u.teacherCode ?? '',
    username: u.username,
    lastName: u.lastName ?? '',
    firstName: u.firstName ?? '',
    email: u.email ?? '',
    phone: u.phone ?? '',
    status: u.status,
    enabled: u.enabled,
    roles: (u.roles ?? []) as string[],
  };
}
