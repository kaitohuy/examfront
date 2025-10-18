import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FileArchiveService } from '../../../services/file-archive.service';
import { sharedImports } from '../../../shared/shared-imports';
import { FormControl } from '@angular/forms';
import { ReleaseAtDTO } from '../../../models/ReleaseAtDTO';

export interface ReleaseAtDialogData {
  id: number;
  filename: string;
}
export interface ReleaseAtDialogResult {
  releaseAtIso: string | null;
}

@Component({
  selector: 'app-release-at-dialog',
  standalone: true,
  templateUrl: './release-at-dialog.component.html',
  styleUrls: ['./release-at-dialog.component.css'],
  imports: [
    ...sharedImports
  ]
})
export class ReleaseAtDialogComponent implements OnInit {
  dtLocal = new FormControl<string>('');
  loading = false;
  errorMsg = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ReleaseAtDialogData,
    private ref: MatDialogRef<ReleaseAtDialogComponent, ReleaseAtDialogResult>,
    private api: FileArchiveService
  ) { }

  ngOnInit(): void {
    this.loading = true;
    this.api.getReleaseAt(this.data.id).subscribe({
      next: (dto: ReleaseAtDTO) => {
        const iso = dto?.releaseAt || null;
        this.dtLocal.setValue(iso ? this.isoToLocal(iso) : '');
        this.loading = false;
      },
      error: () => { this.dtLocal.setValue(''); this.loading = false; } // BE chưa có GET -> coi như null
    });
  }

  private isoToLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private localToIso(s: string): string {
    return new Date(s).toISOString();
  }

  save() {
    const v = (this.dtLocal.value || '').trim();
    const iso = v ? this.localToIso(v) : null;
    this.ref.close({ releaseAtIso: iso });
  }
  clear() { this.dtLocal.setValue(''); }
  cancel() { this.ref.close(); }
}
