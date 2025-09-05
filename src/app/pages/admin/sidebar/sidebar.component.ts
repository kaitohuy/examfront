import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

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
export class SidebarComponent {
  @Input() base: string = '';
  @Input() showUserManagement: boolean = false;
  @Input() showDepartment: boolean = false;
  @Input() showMySubject: boolean = false;
  @Input() showArchive: boolean = false;
  @Input() isCollapsed: boolean = false;
  
  @Output() toggleSidebar = new EventEmitter<boolean>();
  
  archiveOpen = false;

  to(...paths: string[]): string {
    return `/${this.base}/${paths.join('/')}`;
  }

  onToggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.toggleSidebar.emit(this.isCollapsed);
  }
}