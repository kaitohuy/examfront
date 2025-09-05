import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExportQuestionsDialogComponent } from './export-questions-dialog.component';

describe('ExportQuestionsDialogComponent', () => {
  let component: ExportQuestionsDialogComponent;
  let fixture: ComponentFixture<ExportQuestionsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportQuestionsDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ExportQuestionsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
