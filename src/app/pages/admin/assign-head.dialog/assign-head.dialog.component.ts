import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DepartmentService } from '../../../services/department.service';
import { sharedImports } from '../../../shared/shared-imports';

interface Dept { id: number; name: string; description?: string }
interface AssignHeadData { userId: number; userName?: string }

// assign-head.dialog.ts (template)
@Component({
  standalone: true,
  selector: 'app-assign-head-dialog',
  imports: [
    ...sharedImports
  ],
  templateUrl: './assign-head.dialog.component.html',
  styleUrl: './assign-head.dialog.component.css'
})

export class AssignHeadDialogComponent implements OnInit {
  depts: Dept[] = [];
  deptId = new FormControl<number | null>(null);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: AssignHeadData,
    private ref: MatDialogRef<AssignHeadDialogComponent>,
    private deptSvc: DepartmentService
  ) {}

  ngOnInit(): void {
    this.deptSvc.getAllDepartment().subscribe(ds => this.depts = ds ?? []);
  }

  close(){ this.ref.close(); }
  ok(){ this.ref.close({ departmentId: this.deptId.value }); }
}
