// src/app/services/auto-paper-setting.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import baseUrl from './helper';
import { AutoPaperSettingDTO } from '../models/autoGen';

@Injectable({ providedIn: 'root' })
export class AutoPaperSettingService {
  constructor(private http: HttpClient) {}

  get(subjectId: number): Observable<AutoPaperSettingDTO> {
    return this.http.get<AutoPaperSettingDTO>(`${baseUrl}/auto-paper/setting/${subjectId}`);
  }

  update(subjectId: number, dto: AutoPaperSettingDTO): Observable<AutoPaperSettingDTO> {
    return this.http.put<AutoPaperSettingDTO>(`${baseUrl}/auto-paper/setting/${subjectId}`, dto);
  }

  // NEW
  listTypeCodes(subjectId: number): Observable<string[]> {
    return this.http.get<string[]>(`${baseUrl}/auto-paper/setting/${subjectId}/type-codes`);
  }

  // NEW
  resetDefault(subjectId: number): Observable<AutoPaperSettingDTO> {
    return this.http.post<AutoPaperSettingDTO>(`${baseUrl}/auto-paper/setting/${subjectId}/reset-default`, {});
  }
}
