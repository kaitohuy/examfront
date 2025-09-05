import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subject } from '../models/subject';
import { Observable } from 'rxjs';
import baseUrl from './helper';
import { TeacherAssignmentDTO } from '../models/teacherAssignmentDTO';
import { SubjectWithTeachers } from '../models/subjectWithTeachers ';

@Injectable({
  providedIn: 'root'
})
export class SubjectService {

  constructor(private _http: HttpClient) { }

  // Lấy tất cả môn học
  getAllSubjects(): Observable<Subject[]> {
    return this._http.get<Subject[]>(`${baseUrl}/subject/`);
  }

  // Lấy môn học theo ID (có thông tin giáo viên)
  getSubjectById(id: number): Observable<SubjectWithTeachers> {
    return this._http.get<SubjectWithTeachers>(`${baseUrl}/subject/${id}`);
  }

  // Lấy môn học theo bộ môn
  getSubjectsByDepartment(departmentId: number): Observable<Subject[]> {
    return this._http.get<Subject[]>(`${baseUrl}/subject/department/${departmentId}`);
  }

  // Tạo môn học mới
  createSubject(subject: any): Observable<Subject> {
    return this._http.post<Subject>(`${baseUrl}/subject/`, subject);
  }

  // Cập nhật môn học
  updateSubject(id: number, subject: any): Observable<Subject> {
    return this._http.put<Subject>(`${baseUrl}/subject/${id}`, subject);
  }

  // Xóa môn học
  deleteSubject(id: number): Observable<void> {
    return this._http.delete<void>(`${baseUrl}/subject/${id}`);
  }

  // Phân công giảng dạy
  assignTeacher(subjectId: number, teacherId: number): Observable<any> {
    const dto: TeacherAssignmentDTO = { teacherId };
    return this._http.post(`${baseUrl}/subject/${subjectId}/teachers`, dto);
  }

  // Hủy phân công giảng dạy
  removeTeacher(subjectId: number, teacherId: number): Observable<any> {
    return this._http.delete(`${baseUrl}/subject/${subjectId}/teachers/${teacherId}`);
  }

  // subject.service.ts
  getSubjectMetaById(id: number) {
    return this._http.get<Subject>(`${baseUrl}/subject/${id}/meta`);
  }
  getMySubjects() {
    return this._http.get<Subject[]>(`${baseUrl}/subject/my`);
  }

}
