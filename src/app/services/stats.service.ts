import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import baseUrl from './helper';
import { Observable } from 'rxjs';
import { AdminOverview } from '../models/admin-overview';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private base = `${baseUrl}/api/stats`;

  constructor(private http: HttpClient) { }

  adminOverview(from?: Date | null, to?: Date | null): Observable<AdminOverview> {
    let params = new HttpParams();
    if (from) params = params.set('from', this.ymd(from));
    if (to) params = params.set('to', this.ymd(to));
    return this.http.get<AdminOverview>(`${this.base}/admin/overview`, { params });
  }

  getHeadOverview(opts: { departmentId?: number; from?: string; to?: string } = {}) {
    let p = new HttpParams();
    if (opts.departmentId != null) p = p.set('departmentId', String(opts.departmentId));
    if (opts.from) p = p.set('from', opts.from);
    if (opts.to) p = p.set('to', opts.to);
    return this.http.get<AdminOverview>(`${this.base}/head/overview`, { params: p });
  }

  teacherOverview(params: { userId?: number; from?: string; to?: string }) {
    const httpParams: any = {};
    if (params.userId != null) httpParams.userId = params.userId;
    if (params.from) httpParams.from = params.from;
    if (params.to) httpParams.to = params.to;
    return this.http.get(`${this.base}/teacher/overview`, { params: httpParams });
  }

  private ymd(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

