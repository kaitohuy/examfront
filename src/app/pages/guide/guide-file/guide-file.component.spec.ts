import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuideFileComponent } from './guide-file.component';

describe('GuideFileComponent', () => {
  let component: GuideFileComponent;
  let fixture: ComponentFixture<GuideFileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuideFileComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GuideFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
