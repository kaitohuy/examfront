// src/app/services/auto-paper-setting.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import baseUrl from './helper';
import { AutoPaperSettingDTO, AutoSettingKind } from '../models/autoGen';

@Injectable({ providedIn: 'root' })
export class AutoPaperSettingService {
  constructor(private http: HttpClient) {}

  get(subjectId: number, kind: AutoSettingKind = 'EXAM'): Observable<AutoPaperSettingDTO> {
    return this.http.get<AutoPaperSettingDTO>(
      `${baseUrl}/auto-paper/setting/${subjectId}`,
      { params: { kind } }
    );
  }

  update(subjectId: number, dto: AutoPaperSettingDTO, kind: AutoSettingKind = 'EXAM'):
    Observable<AutoPaperSettingDTO> {
    return this.http.put<AutoPaperSettingDTO>(
      `${baseUrl}/auto-paper/setting/${subjectId}`,
      dto,
      { params: { kind } }
    );
  }

  listTypeCodes(subjectId: number): Observable<string[]> {
    return this.http.get<string[]>(
      `${baseUrl}/auto-paper/setting/${subjectId}/type-codes`
    );
  }

  resetDefault(subjectId: number, kind: AutoSettingKind = 'EXAM'):
    Observable<AutoPaperSettingDTO> {
    return this.http.post<AutoPaperSettingDTO>(
      `${baseUrl}/auto-paper/setting/${subjectId}/reset-default`,
      {},
      { params: { kind } }
    );
  }
}
