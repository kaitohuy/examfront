import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeadUserManagementComponent } from './head-user-management.component';

describe('HeadUserManagementComponent', () => {
  let component: HeadUserManagementComponent;
  let fixture: ComponentFixture<HeadUserManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeadUserManagementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HeadUserManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
