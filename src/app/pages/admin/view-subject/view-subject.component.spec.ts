import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewSubjectComponent } from './view-subject.component';

describe('ViewSubjectComponent', () => {
  let component: ViewSubjectComponent;
  let fixture: ComponentFixture<ViewSubjectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewSubjectComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ViewSubjectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
