import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserSubjectListComponent } from './user-subject-list.component';

describe('UserSubjectListComponent', () => {
  let component: UserSubjectListComponent;
  let fixture: ComponentFixture<UserSubjectListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserSubjectListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UserSubjectListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
