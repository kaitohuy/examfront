import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamTasksComponent } from './exam-tasks.component';

describe('ExamTasksComponent', () => {
  let component: ExamTasksComponent;
  let fixture: ComponentFixture<ExamTasksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamTasksComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ExamTasksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
