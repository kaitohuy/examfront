import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuidePageSharedComponent } from './guide-page-shared.component';

describe('GuidePageSharedComponent', () => {
  let component: GuidePageSharedComponent;
  let fixture: ComponentFixture<GuidePageSharedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuidePageSharedComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GuidePageSharedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
