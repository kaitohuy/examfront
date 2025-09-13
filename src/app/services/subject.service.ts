// src/app/services/subject.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import baseUrl from './helper';

import { Subject } from '../models/subject';
import { TeacherAssignmentDTO } from '../models/teacherAssignmentDTO';
import { SubjectWithTeachers } from '../models/subjectWithTeachers';

@Injectable({ providedIn: 'root' })
export class SubjectService {
  constructor(private _http: HttpClient) { }

  // ===== CRUD cơ bản =====
  getAllSubjects(): Observable<Subject[]> {
    return this._http.get<Subject[]>(`${baseUrl}/subject/`);
  }

  // Có kèm teachers
  getSubjectById(id: number): Observable<SubjectWithTeachers> {
    return this._http.get<SubjectWithTeachers>(`${baseUrl}/subject/${id}`);
  }

  createSubject(subject: any): Observable<Subject> {
    return this._http.post<Subject>(`${baseUrl}/subject/`, subject);
  }

  updateSubject(id: number, subject: any): Observable<Subject> {
    return this._http.put<Subject>(`${baseUrl}/subject/${id}`, subject);
  }

  deleteSubject(id: number): Observable<void> {
    return this._http.delete<void>(`${baseUrl}/subject/${id}`);
  }

  // ===== Phân công / Hủy phân công =====
  assignTeacher(subjectId: number, teacherId: number): Observable<void> {
    const dto: TeacherAssignmentDTO = { teacherId };
    return this._http.post<void>(`${baseUrl}/subject/${subjectId}/teachers`, dto);
  }

  removeTeacher(subjectId: number, teacherId: number): Observable<void> {
    return this._http.delete<void>(`${baseUrl}/subject/${subjectId}/teachers/${teacherId}`);
  }

  /**
   * Cập nhật danh sách GV theo kiểu "diff" so với hiện tại:
   * - nextIds: danh sách id GV sau khi người dùng chọn
   * - prevIds: danh sách id GV hiện đang được phân công
   *
   * Sẽ gọi POST cho ids cần thêm, DELETE cho ids cần xóa.
   */
  updateSubjectTeachersDiff(
    subjectId: number,
    nextIds: number[],
    prevIds: number[]
  ): Observable<any> {
    const nextSet = new Set(nextIds);
    const prevSet = new Set(prevIds);

    const toAdd = [...nextSet].filter(id => !prevSet.has(id));
    const toRemove = [...prevSet].filter(id => !nextSet.has(id));

    const addCalls = toAdd.map(id => this.assignTeacher(subjectId, id));
    const removeCalls = toRemove.map(id => this.removeTeacher(subjectId, id));

    if (addCalls.length === 0 && removeCalls.length === 0) return of(null);

    return forkJoin([...addCalls, ...removeCalls]);
  }

  // ===== Meta / tiện ích khác =====
  getSubjectMetaById(id: number) {
    return this._http.get<Subject>(`${baseUrl}/subject/${id}/meta`);
  }

  getMySubjects() {
    return this._http.get<Subject[]>(`${baseUrl}/subject/my`);
  }

  getSubjectsByDepartment(deptId: number, includeTeachers = false) {
    const include = includeTeachers ? '?include=teachers' : '';
    return this._http.get<any[]>(`${baseUrl}/subject/department/${deptId}${include}`);
  }
}
