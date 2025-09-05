import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PracticeQuestionTabComponent } from './practice-question-tab.component';

describe('PracticeQuestionTabComponent', () => {
  let component: PracticeQuestionTabComponent;
  let fixture: ComponentFixture<PracticeQuestionTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PracticeQuestionTabComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PracticeQuestionTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
