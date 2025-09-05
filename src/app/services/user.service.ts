import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import baseUrl from './helper';
import { UserWithRolesAndDeptDTO } from '../models/user-dto';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private http: HttpClient) { }

  //add user
  public addUser(user: any) {
    return this.http.post(`${baseUrl}/user/`, user);
  }

  //get all users
  public getAllUsers(): Observable<UserWithRolesAndDeptDTO[]> {
    return this.http.get<UserWithRolesAndDeptDTO[]>(`${baseUrl}/user/with-dept`);
  }

  //delete user
  public deleteUser(userId: number) {
    return this.http.delete(`${baseUrl}/user/${userId}`);
  }

  //toggle user enabled status
  public toggleEnabled(userId: number, enabled: boolean) {
    return this.http.put(`${baseUrl}/user/${userId}/toggle-enabled`, { enabled });
  }

  //reset user password
  public resetPassword(userId: number, newPassword: string) {
    return this.http.post(`${baseUrl}/user/${userId}/reset-password`, { newPassword });
  }

  //update user roles
  public updateRoles(userId: number, roles: string[]) {
    return this.http.put(`${baseUrl}/user/${userId}/roles`, { roles });
  }

  // get user statistics
  public getUserStatistics() {
    return this.http.get(`${baseUrl}/user/user-statistics`);
  }

}
