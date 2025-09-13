import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { sharedImports } from '../shared-imports';
import { Block, Topic } from '../guide-types';


@Component({
  selector: 'app-guide-page-shared',
  standalone: true,
  imports: [...sharedImports],
  templateUrl: './guide-page-shared.component.html',
  styleUrls: ['./guide-page-shared.component.css'],
})
export class GuidePageSharedComponent implements OnChanges {
  @Input() topics: Topic[] = [];
  @Input() startId?: string;
  @Input() ctaText?: string;
  @Input() ctaLink?: any[];
  @Output() cta = new EventEmitter<void>();

  selectedId: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['topics'] || changes['startId']) {
      this.selectedId = this.resolveStartId();
    }
  }

  private resolveStartId(): string | null {
    if (!this.topics?.length) return null;
    if (this.startId && this.topics.some(t => t.id === this.startId)) return this.startId;
    return this.topics[0].id;
  }

  get selected(): Topic | null {
    return this.topics.find(t => t.id === this.selectedId) ?? null;
  }

  select(id: string) {
    this.selectedId = id;
    document.getElementById('guide-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  trackBlock = (_: number, b: Block) =>
    (b as any).text ?? (b as any).src ?? (b as any).html ?? JSON.stringify(b);
}
