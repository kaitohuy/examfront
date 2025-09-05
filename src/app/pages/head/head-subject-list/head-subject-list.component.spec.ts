import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeadSubjectListComponent } from './head-subject-list.component';

describe('HeadSubjectListComponent', () => {
  let component: HeadSubjectListComponent;
  let fixture: ComponentFixture<HeadSubjectListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeadSubjectListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HeadSubjectListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
