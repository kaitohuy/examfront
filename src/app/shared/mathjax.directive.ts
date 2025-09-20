// src/app/shared/mathjax.directive.ts
import { AfterViewInit, Directive, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MathjaxService } from '../services/math-jax.service';

@Directive({
  selector: '[appMathjax]',
  standalone: true,
})
export class MathjaxDirective implements AfterViewInit, OnChanges {
   @Input() appMathjax: string | null | undefined = '';

  constructor(private el: ElementRef<HTMLElement>, private mj: MathjaxService) {}

  ngAfterViewInit(): void { this.apply(); }
  ngOnChanges(changes: SimpleChanges): void {
    if ('appMathjax' in changes) this.apply();
  }

  private apply(): void {
    const host = this.el.nativeElement;
    host.textContent = this.appMathjax ?? '';
    this.mj.typeset(host);
  }
}
