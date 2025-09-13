import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import baseUrl from './helper';
import { Department } from '../models/department';
import { HeadDeptStats } from '../models/stats';


@Injectable({
  providedIn: 'root'
})
export class DepartmentService {

  constructor(private _http: HttpClient) { }

  // Lấy tất cả department
  public getAllDepartment(): Observable<Department[]> {
    return this._http.get<Department[]>(`${baseUrl}/department/`);
  }

  //Lấy 1 department
  public getDepartment(id: number): Observable<Department> {
    return this._http.get<Department>(`${baseUrl}/department/${id}`);
  }

  // Tạo department mới
  public createDepartment(department: any): Observable<Department> {
    return this._http.post<Department>(`${baseUrl}/department/`, department);
  }

  // Cập nhật department
  public updateDepartment(id: number, department: any): Observable<Department> {
    return this._http.put<Department>(`${baseUrl}/department/${id}`, department);
  }

  // Xóa department
  public deleteDepartment(id: number): Observable<void> {
    return this._http.delete<void>(`${baseUrl}/department/${id}`);
  }

  // Lấy môn học theo department (bổ sung mới)
  public getSubjectsByDepartment(departmentId: number): Observable<any> {
    return this._http.get<any>(`${baseUrl}/subject/department/${departmentId}`);
  }

  public getDepartmentsByHead(headUserId: number) {
    return this._http.get<Department[]>(`${baseUrl}/department/head/${headUserId}`);
  }

  getDepartmentStats(id: number) {
    return this._http.get<HeadDeptStats>(`${baseUrl}/department/${id}/stats`);
  }
}