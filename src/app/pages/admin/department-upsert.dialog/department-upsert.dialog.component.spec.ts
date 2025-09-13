import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DepartmentUpsertDialogComponent } from './department-upsert.dialog.component';

describe('DepartmentUpsertDialogComponent', () => {
  let component: DepartmentUpsertDialogComponent;
  let fixture: ComponentFixture<DepartmentUpsertDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepartmentUpsertDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DepartmentUpsertDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
