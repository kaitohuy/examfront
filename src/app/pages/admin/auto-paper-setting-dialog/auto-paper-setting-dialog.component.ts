import { Component, Inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { AutoPaperSettingService } from '../../../services/auto-paper-setting.service';
import {
  UnitKind, ItemNature, AutoGenSelectorDTO, AutoGenStepDTO, AutoPaperSettingDTO,
  AutoSettingKind
} from '../../../models/autoGen';
import { QuestionService } from '../../../services/question.service';

type DialogData = { subjectId: number; kind?: AutoSettingKind };

@Component({
  selector: 'app-auto-paper-setting-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatIconModule, MatButtonModule, MatSlideToggleModule,
    MatTooltipModule, MatProgressBarModule,
    MatExpansionModule
  ],
  templateUrl: './auto-paper-setting-dialog.component.html',
  styleUrls: ['./auto-paper-setting-dialog.component.css']
})
export class AutoPaperSettingDialogComponent implements OnInit {

  kind: AutoSettingKind = 'EXAM';
  dialogTitle = 'Cấu hình đề THI tự động';

  loading = signal(true);
  saving = signal(false);

  // UI choices
  unitKinds: { value: UnitKind, label: string }[] = [
    { value: 'SUB_ITEM', label: 'Ý nhỏ' },
    { value: 'FULL_QUESTION', label: 'Cả câu' },
  ];
  natures: { value: ItemNature, label: string }[] = [
    { value: 'THEORY', label: 'Lý thuyết' },
    { value: 'EXERCISE', label: 'Ứng dụng' },
  ];
  typeCodes: string[] = [];

  problemTypes: string[] = [];

  clos: string[] = ['CLO1', 'CLO2'];

  form = this.fb.group({
    name: this.fb.control<string>('Default', { nonNullable: true, validators: [Validators.required] }),
    variants: this.fb.control<number>(1, { nonNullable: true, validators: [Validators.min(1)] }),
    notUsedYears: this.fb.control<number>(1, { nonNullable: true, validators: [Validators.min(0)] }),
    noRepeatWithin: this.fb.control<boolean>(true, { nonNullable: true }),
    noRepeatAcross: this.fb.control<boolean>(false, { nonNullable: true }),
    steps: this.fb.array<FormGroup>([])
  });

  get stepsFA() { return this.form.get('steps') as FormArray<FormGroup>; }

  // để render tiêu đề ở header panel
  titleOf(i: number) {
    const g = this.stepsFA.at(i) as FormGroup;
    return (g?.get('title')?.value as string) || `Câu ${i + 1}`;
  }

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private fb: FormBuilder,
    public ref: MatDialogRef<AutoPaperSettingDialogComponent>,
    private api: AutoPaperSettingService,
    private questionService: QuestionService
  ) { }

  ngOnInit(): void {
    // NEW: đọc kind từ data
    this.kind = this.data.kind ?? 'EXAM';

    // NEW: đặt title theo kind
    this.dialogTitle = this.kind === 'EXAM'
      ? 'Cấu hình đề THI tự động'
      : 'Cấu hình đề ÔN TẬP tự động';

    this.loadAll();
  }

  loadAll() {
    this.loading.set(true);
    // nạp song song setting + type codes
    this.api.listTypeCodes(this.data.subjectId).subscribe({
      next: (codes) => this.typeCodes = codes ?? [],
      error: () => (this.typeCodes = [])
    });

    // NEW: truyền kind
    this.api.get(this.data.subjectId, this.kind).subscribe({
      next: (dto) => { this.patchAll(dto); this.loading.set(false); },
      error: (err) => { console.error(err); this.loading.set(false); }
    });

    this.questionService.getProblemTypes(this.data.subjectId).subscribe({
      next: (types) => this.problemTypes = types ?? [],
      error: () => this.problemTypes = []
    });
  }

  resetDefault() {
    this.loading.set(true);
    // NEW: truyền kind
    this.api.resetDefault(this.data.subjectId, this.kind).subscribe({
      next: (dto) => { this.patchAll(dto); this.loading.set(false); },
      error: (err) => { console.error(err); this.loading.set(false); }
    });
  }

  private patchAll(dto: AutoPaperSettingDTO) {
    this.form.patchValue({
      name: dto.name ?? 'Default',
      variants: dto.variants ?? 1,
      notUsedYears: dto.notUsedYears ?? 1,
      noRepeatWithin: !!dto.noRepeatWithin,
      noRepeatAcross: !!dto.noRepeatAcross,
    });

    this.stepsFA.clear();
    const steps = dto.steps ?? [];
    if (steps.length > 0) {
      steps.forEach(s => this.stepsFA.push(this.buildStepFG(s)));
    } else {
      this.addStep();
    }
  }

  // ==== builders ====
  buildStepFG(s?: AutoGenStepDTO) {
    return this.fb.group({
      title: new FormControl<string>(s?.title ?? '', { nonNullable: true }),
      selectors: this.fb.array<FormGroup>(
        (s?.selectors ?? []).map(sel => this.buildSelectorFG(sel))
      )
    });
  }

  buildSelectorFG(sel?: AutoGenSelectorDTO) {
    const fg = this.fb.group({
      unitKind: new FormControl<UnitKind | null>(sel?.unitKind ?? 'SUB_ITEM'),
      chapterIn: new FormControl<number[] | null>(sel?.chapterIn ?? null),
      pointsEq: new FormControl<number | null>(sel?.pointsEq ?? null),
      typeCodeIn: new FormControl<string[] | null>(sel?.typeCodeIn ?? null),
      nature: new FormControl<ItemNature | null>(sel?.nature ?? null),
      problemTypeIn: new FormControl<string[] | null>(sel?.problemTypeIn ?? null),
      cloIn: new FormControl<string[] | null>(sel?.cloIn ?? null),
    });

    fg.get('unitKind')!.valueChanges.subscribe(v => {
      if (v !== 'SUB_ITEM') {
        fg.get('problemTypeIn')!.setValue(null);
      }
    });

    return fg;
  }

  // ==== operations ====
  addStep() { this.stepsFA.push(this.buildStepFG({ title: '', selectors: [] })); }
  removeStep(i: number) { this.stepsFA.removeAt(i); }

  selectorsFA(stepIndex: number) {
    return this.stepsFA.at(stepIndex).get('selectors') as FormArray<FormGroup>;
  }
  addSelector(i: number) { this.selectorsFA(i).push(this.buildSelectorFG()); }
  removeSelector(i: number, j: number) { this.selectorsFA(i).removeAt(j); }

  private toDto(): AutoPaperSettingDTO {
    const v = this.form.getRawValue();

    const steps: AutoGenStepDTO[] = this.stepsFA.controls.map(stepFG => {
      const selArr: AutoGenSelectorDTO[] = (stepFG.get('selectors') as FormArray<FormGroup>).controls.map(sfg => {
        return {
          unitKind: sfg.get('unitKind')?.value ?? null,
          chapterIn: sfg.get('chapterIn')?.value ?? null,
          pointsEq: sfg.get('pointsEq')?.value ?? null,
          pointsMin: null,
          pointsMax: null,
          typeCodeIn: sfg.get('typeCodeIn')?.value ?? null,
          nature: sfg.get('nature')?.value ?? null,
          status: 'APPROVED',
          cognitive: null,
          problemTypeIn: sfg.get('problemTypeIn')?.value ?? null,
          cloIn: sfg.get('cloIn')?.value ?? null,
        };
      });
      return { title: stepFG.get('title')?.value ?? '', selectors: selArr };
    });

    return {
      name: v.name!,
      variants: v.variants!,
      notUsedYears: v.notUsedYears!,
      noRepeatWithin: v.noRepeatWithin!,
      noRepeatAcross: v.noRepeatAcross!,
      labelScope: [],
      steps,
      kind: this.kind
    };
  }


  save() {
    if (this.form.invalid) return;
    const dto = this.toDto();
    this.saving.set(true);
    this.api.update(this.data.subjectId, dto, this.kind).subscribe({
      next: (res) => { this.saving.set(false); this.ref.close(res); },
      error: (err) => { console.error(err); this.saving.set(false); }
    });
  }


  close() { this.ref.close(); }
}
