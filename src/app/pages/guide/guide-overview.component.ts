// pages/guide/guide-overview.component.ts
import { Component } from '@angular/core';
import { sharedImports } from '../../shared/shared-imports';

@Component({
  standalone: true,
  selector: 'app-guide-overview',
  imports: [...sharedImports],
  template: `
    <h2>Hướng dẫn sử dụng</h2>
    <p class="text-muted">Chọn một chủ đề ở sidebar: Quản lý nhân sự, Kho đề, Đề thi...</p>
    <img src="https://placehold.co/960x400" class="img-fluid rounded mt-3" alt="overview">
  `
})
export class GuideOverviewComponent {}
