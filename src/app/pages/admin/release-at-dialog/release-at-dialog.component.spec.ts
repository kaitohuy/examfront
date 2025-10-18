import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReleaseAtDialogComponent } from './release-at-dialog.component';

describe('ReleaseAtDialogComponent', () => {
  let component: ReleaseAtDialogComponent;
  let fixture: ComponentFixture<ReleaseAtDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReleaseAtDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReleaseAtDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
