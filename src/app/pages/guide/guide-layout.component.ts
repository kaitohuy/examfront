// pages/guide/guide-layout.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { sharedImports } from '../../shared/shared-imports';

@Component({
  standalone: true,
  selector: 'app-guide-layout',
  imports: [RouterOutlet, ...sharedImports],
  template: `<div class="container mt-4"><router-outlet></router-outlet></div>`
})
export class GuideLayoutComponent {}
