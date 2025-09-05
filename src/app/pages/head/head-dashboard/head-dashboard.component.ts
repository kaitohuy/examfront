import { Component } from '@angular/core';
import { SidebarComponent } from "../../admin/sidebar/sidebar.component";
import { RouterModule } from "@angular/router";

@Component({
  selector: 'app-head-dashboard',
  standalone: true,
  imports: [SidebarComponent, RouterModule],
  templateUrl: './head-dashboard.component.html',
  styleUrl: './head-dashboard.component.css'
})
export class HeadDashboardComponent {
  isSidebarCollapsed = false;

  onSidebarToggle(collapsed: boolean) {
    this.isSidebarCollapsed = collapsed;
  }
}
