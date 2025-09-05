import { Component, OnInit } from '@angular/core';
import { sharedImports } from '../../shared/shared-imports';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ...sharedImports,
    
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  // Add any properties or methods needed for the profile component

  user: any = null;

  constructor(private login:LoginService) { }

  ngOnInit(): void {
    this.user = this.login.getUser();
  }

}
