import { Injectable } from '@angular/core';

declare global {
  interface Window { MathJax?: any; }
}

@Injectable({ providedIn: 'root' })
export class MathjaxService {
  typeset(element?: HTMLElement): Promise<void> {
    const MJ = window.MathJax;
    if (!MJ) return Promise.resolve();
    const targets = element ? [element] : undefined;
    MJ.typesetClear?.(targets);
    return MJ.typesetPromise ? MJ.typesetPromise(targets) : Promise.resolve();
  }
}
