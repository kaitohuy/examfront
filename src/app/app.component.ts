import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from "@angular/router";
import { NavbarComponent } from "./components/navbar/navbar.component";
import { sharedImports } from "./shared/shared-imports";
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
import { filter } from "rxjs";
import { DOCUMENT } from "@angular/common";


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NavbarComponent, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  hideNavbar = false;

  constructor(
    private router: Router,
    private ar: ActivatedRoute,
    private r2: Renderer2,
    @Inject(DOCUMENT) private doc: Document
  ) {}

  ngOnInit(): void {
    this.applyByRouteTree();
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.applyByRouteTree());
  }

  private applyByRouteTree() {
    let r = this.ar;
    while (r.firstChild) r = r.firstChild;
    const data = r.snapshot.data || {};
    this.hideNavbar = !!data['hideNavbar'];

    const needAuthBg = !!data['authBg'];
    if (needAuthBg) this.r2.addClass(this.doc.body, 'auth-bg');
    else this.r2.removeClass(this.doc.body, 'auth-bg');
  }
}
