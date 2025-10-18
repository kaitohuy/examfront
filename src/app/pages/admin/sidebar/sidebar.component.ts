import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LoginService } from '../../../services/login.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  @Input() base: string = '';
  @Input() showUserManagement: boolean = false;
  @Input() showDepartment: boolean = false;
  @Input() showMySubject: boolean = false;
  @Input() showArchive: boolean = false;
  @Input() showTasks: boolean = false;
  @Input() isCollapsed: boolean = false;
  @Input() showGuideGeneral = false;
  @Input() showGuideDepartment = false;
  @Input() showGuideSubject = false;
  @Input() showGuideQuestion = false;
  @Input() showGuideFile = false;
  @Output() toggleSidebar = new EventEmitter<boolean>();

  archiveOpen = false;
  guideOpen = false;
  manageDepartment = "";
  constructor(
    private login: LoginService
  ) {}
  ngOnInit(): void {
    if (this.login.getUserRole() === 'ADMIN') {
      this.manageDepartment = "Quản lý bộ môn";
    }else {
      this.manageDepartment = "Quản lý học phần";
    }
  }

  to(...paths: string[]): string {
    return `/${this.base}/${paths.join('/')}`;
  }

  get hasAnyGuide(): boolean {
    return this.showGuideGeneral || this.showUserManagement || this.showGuideDepartment || this.showGuideSubject;
  }

  onToggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.toggleSidebar.emit(this.isCollapsed);
  }
}