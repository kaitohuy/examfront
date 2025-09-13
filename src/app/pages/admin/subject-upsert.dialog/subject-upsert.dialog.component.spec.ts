import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubjectUpsertDialogComponent } from './subject-upsert.dialog.component';

describe('SubjectUpsertDialogComponent', () => {
  let component: SubjectUpsertDialogComponent;
  let fixture: ComponentFixture<SubjectUpsertDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubjectUpsertDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SubjectUpsertDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
