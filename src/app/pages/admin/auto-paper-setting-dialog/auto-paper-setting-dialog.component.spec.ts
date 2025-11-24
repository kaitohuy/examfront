import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AutoPaperSettingDialogComponent } from './auto-paper-setting-dialog.component';

describe('AutoPaperSettingDialogComponent', () => {
  let component: AutoPaperSettingDialogComponent;
  let fixture: ComponentFixture<AutoPaperSettingDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutoPaperSettingDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AutoPaperSettingDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
