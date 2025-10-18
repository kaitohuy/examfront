import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrashQuestionComponent } from './trash-question.component';

describe('TrashQuestionComponent', () => {
  let component: TrashQuestionComponent;
  let fixture: ComponentFixture<TrashQuestionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrashQuestionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TrashQuestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
