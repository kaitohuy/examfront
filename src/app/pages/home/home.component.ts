import { Component } from '@angular/core';
import { sharedImports } from '../../shared/shared-imports';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    ...sharedImports  
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

}
