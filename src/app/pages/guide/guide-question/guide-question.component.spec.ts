import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuideQuestionComponent } from './guide-question.component';

describe('GuideQuestionComponent', () => {
  let component: GuideQuestionComponent;
  let fixture: ComponentFixture<GuideQuestionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuideQuestionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GuideQuestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
