import { NavbarComponent } from "./components/navbar/navbar.component";
import { sharedImports } from "./shared/shared-imports";
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    ...sharedImports,
    NavbarComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'examfront';
}
