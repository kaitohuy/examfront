import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CloneQuickEditDialogComponent } from './clone-quick-edit-dialog.component';

describe('CloneQuickEditDialogComponent', () => {
  let component: CloneQuickEditDialogComponent;
  let fixture: ComponentFixture<CloneQuickEditDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CloneQuickEditDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CloneQuickEditDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
