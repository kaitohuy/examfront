import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToolMathComponent } from './tool-math.component';

describe('ToolMathComponent', () => {
  let component: ToolMathComponent;
  let fixture: ComponentFixture<ToolMathComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolMathComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ToolMathComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
