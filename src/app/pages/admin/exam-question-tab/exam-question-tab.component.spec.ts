import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamQuestionTabComponent } from './exam-question-tab.component';

describe('ExamQuestionTabComponent', () => {
  let component: ExamQuestionTabComponent;
  let fixture: ComponentFixture<ExamQuestionTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamQuestionTabComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ExamQuestionTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
