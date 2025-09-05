import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionEditDialogComponent } from './question-edit-dialog.component';

describe('QuestionEditDialogComponent', () => {
  let component: QuestionEditDialogComponent;
  let fixture: ComponentFixture<QuestionEditDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionEditDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(QuestionEditDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
