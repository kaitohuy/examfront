import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignHeadDialogComponent } from './assign-head.dialog.component';

describe('AssignHeadDialogComponent', () => {
  let component: AssignHeadDialogComponent;
  let fixture: ComponentFixture<AssignHeadDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignHeadDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AssignHeadDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
