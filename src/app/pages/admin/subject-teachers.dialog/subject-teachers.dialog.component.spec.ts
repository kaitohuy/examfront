import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubjectTeachersDialogComponent } from './subject-teachers.dialog.component';

describe('SubjectTeachersDialogComponent', () => {
  let component: SubjectTeachersDialogComponent;
  let fixture: ComponentFixture<SubjectTeachersDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubjectTeachersDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SubjectTeachersDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
