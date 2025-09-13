import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuideDepartmentComponent } from './guide-department.component';

describe('GuideDepartmentComponent', () => {
  let component: GuideDepartmentComponent;
  let fixture: ComponentFixture<GuideDepartmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuideDepartmentComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GuideDepartmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
