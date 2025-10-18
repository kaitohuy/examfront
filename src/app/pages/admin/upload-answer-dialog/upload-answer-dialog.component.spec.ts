import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadAnswerDialogComponent } from './upload-answer-dialog.component';

describe('UploadAnswerDialogComponent', () => {
  let component: UploadAnswerDialogComponent;
  let fixture: ComponentFixture<UploadAnswerDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadAnswerDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UploadAnswerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
