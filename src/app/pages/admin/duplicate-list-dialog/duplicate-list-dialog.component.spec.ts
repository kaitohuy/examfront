import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DuplicateListDialogComponent } from './duplicate-list-dialog.component';

describe('DuplicateListDialogComponent', () => {
  let component: DuplicateListDialogComponent;
  let fixture: ComponentFixture<DuplicateListDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DuplicateListDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DuplicateListDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
