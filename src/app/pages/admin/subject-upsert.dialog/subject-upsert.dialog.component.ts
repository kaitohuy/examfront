import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { sharedImports } from '../../../shared/shared-imports';

export interface SubjectUpsertData {
  mode: 'create' | 'edit';
  departmentId: number;
  subject?: { id: number; name: string; code: string } | null;
}

@Component({
  selector: 'app-subject-upsert-dialog',
  standalone: true,
  imports: [...sharedImports, ReactiveFormsModule, MatDialogContent, MatDialogActions],
  templateUrl: './subject-upsert.dialog.component.html'
})
export class SubjectUpsertDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<SubjectUpsertDialogComponent>);
  constructor(@Inject(MAT_DIALOG_DATA) public data: SubjectUpsertData) {}

  title = this.data.mode === 'edit' ? 'Cập nhật môn học' : 'Thêm môn học mới';

  form = this.fb.group({
    name: ['', Validators.required],
    code: ['', Validators.required]
  });

  ngOnInit() {
    if (this.data.subject) {
      this.form.patchValue({
        name: this.data.subject.name,
        code: this.data.subject.code
      });
    }
  }

  save() {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const payload = {
      name: (raw.name || '').trim(),
      code: (raw.code || '').trim(),
      departmentId: this.data.departmentId
    };
    this.dialogRef.close(payload);
  }

  cancel() { this.dialogRef.close(); }
}
