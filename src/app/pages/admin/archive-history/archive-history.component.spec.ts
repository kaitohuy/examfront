import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArchiveHistoryComponent } from './archive-history.component';

describe('ArchiveHistoryComponent', () => {
  let component: ArchiveHistoryComponent;
  let fixture: ComponentFixture<ArchiveHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArchiveHistoryComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ArchiveHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
