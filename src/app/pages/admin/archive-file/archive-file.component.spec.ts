import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArchiveFileComponent } from './archive-file.component';

describe('ArchiveFileComponent', () => {
  let component: ArchiveFileComponent;
  let fixture: ComponentFixture<ArchiveFileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArchiveFileComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ArchiveFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
