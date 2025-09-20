import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadQuestionsDialogComponent } from './upload-questions-dialog.component';

describe('UploadQuestionsDialogComponent', () => {
  let component: UploadQuestionsDialogComponent;
  let fixture: ComponentFixture<UploadQuestionsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadQuestionsDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UploadQuestionsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
