import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeadOverviewComponent } from './head-overview.component';

describe('HeadOverviewComponent', () => {
  let component: HeadOverviewComponent;
  let fixture: ComponentFixture<HeadOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeadOverviewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HeadOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
