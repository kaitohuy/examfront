import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeacherOverviewComponent } from './teacher-overview.component';

describe('TeacherOverviewComponent', () => {
  let component: TeacherOverviewComponent;
  let fixture: ComponentFixture<TeacherOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherOverviewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TeacherOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
