import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EssayAnswerPreviewDialogComponent } from './essay-answer-preview-dialog.component';

describe('EssayAnswerPreviewDialogComponent', () => {
  let component: EssayAnswerPreviewDialogComponent;
  let fixture: ComponentFixture<EssayAnswerPreviewDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EssayAnswerPreviewDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EssayAnswerPreviewDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
