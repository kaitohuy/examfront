import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuideUserManagementComponent } from './guide-user-management.component';

describe('GuideUserManagementComponent', () => {
  let component: GuideUserManagementComponent;
  let fixture: ComponentFixture<GuideUserManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuideUserManagementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GuideUserManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
