import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import baseUrl from './helper';
import { Observable } from 'rxjs';
import { UserWithRolesAndDeptDTO, UserDTO } from '../models/user-dto';
import { AdminStats } from '../models/stats';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private http: HttpClient) { }

  // add user
  addUser(user: any) {
    return this.http.post(`${baseUrl}/user/`, user);
  }

  // get all users (kèm dept/roles)
  getAllUsers(): Observable<UserWithRolesAndDeptDTO[]> {
    return this.http.get<UserWithRolesAndDeptDTO[]>(`${baseUrl}/user/with-dept`);
  }

  getUserById(id: number): Observable<UserWithRolesAndDeptDTO> {
    return this.http.get<UserWithRolesAndDeptDTO>(`${baseUrl}/user/id/${id}`);
  }

  // get user by username (nếu cần)
  getByUsername(username: string): Observable<UserWithRolesAndDeptDTO> {
    return this.http.get<UserWithRolesAndDeptDTO>(`${baseUrl}/user/${encodeURIComponent(username)}`);
  }

  // update user profile
  update(user: Partial<UserDTO> & { id: number }): Observable<UserWithRolesAndDeptDTO> {
    return this.http.put<UserWithRolesAndDeptDTO>(`${baseUrl}/user/`, user);
  }

  // delete user
  deleteUser(userId: number) {
    return this.http.delete(`${baseUrl}/user/${userId}`);
  }

  // toggle user enabled status
  toggleEnabled(userId: number, enabled: boolean) {
    return this.http.put(`${baseUrl}/user/${userId}/toggle-enabled`, { enabled });
  }

  // reset user password
  resetPassword(userId: number, newPassword: string) {
    return this.http.post(`${baseUrl}/user/${userId}/reset-password`, { newPassword });
  }

  // update user roles
  updateRoles(userId: number, roles: string[]) {
    return this.http.put(`${baseUrl}/user/${userId}/roles`, { roles });
  }

  getUserStatistics() {
    return this.http.get<AdminStats>(`${baseUrl}/user/user-statistics`);
  }

  getTeachersByDepartment(deptId: number): Observable<UserWithRolesAndDeptDTO[]> {
    return this.http.get<UserWithRolesAndDeptDTO[]>(`${baseUrl}/user/teachers-by-dept/${deptId}`);
  }

  getTeachersOnly(): Observable<UserWithRolesAndDeptDTO[]> {
    return this.http.get<UserWithRolesAndDeptDTO[]>(`${baseUrl}/user/teachers-only`);
  }
}
