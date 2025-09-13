import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuideSubjectComponent } from './guide-subject.component';

describe('GuideSubjectComponent', () => {
  let component: GuideSubjectComponent;
  let fixture: ComponentFixture<GuideSubjectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuideSubjectComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GuideSubjectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
