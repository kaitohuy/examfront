import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { sharedImports } from '../../../shared/shared-imports';
import { QuestionType } from '../../../models/questionType';
import { Difficulty } from '../../../models/difficulty';
import { CreateQuestion } from '../../../models/createQuestion';
import { Question } from '../../../models/question';

type QuestionLabel = 'PRACTICE' | 'EXAM';

@Component({
  selector: 'app-question-form',
  standalone: true,
  imports: [ReactiveFormsModule, ...sharedImports],
  template: `
    <form [formGroup]="form" class="w-100">
      <mat-form-field appearance="outline" class="w-100">
        <mat-label>Nội dung câu hỏi</mat-label>
        <textarea matInput rows="3" formControlName="content"></textarea>
        <mat-error *ngIf="form.get('content')?.hasError('required')">Bắt buộc</mat-error>
      </mat-form-field>

      <!-- Nhãn -->
      <div class="mb-2">
        <div class="muted mb-1">Nhãn</div>
        <mat-checkbox [checked]="labels.includes('PRACTICE')" (change)="toggleLabel('PRACTICE',$event.checked)">
          Ôn tập (PRACTICE)
        </mat-checkbox>
        <mat-checkbox class="ms-3" [checked]="labels.includes('EXAM')" (change)="toggleLabel('EXAM',$event.checked)">
          Thi cử (EXAM)
        </mat-checkbox>
        <div class="muted">Không chọn gì ⇒ mặc định PRACTICE.</div>
      </div>

      <div class="two-col">
        <mat-form-field appearance="outline">
          <mat-label>Loại câu hỏi</mat-label>
          <mat-select formControlName="questionType">
            <mat-option *ngFor="let t of questionTypes" [value]="t.value">{{ t.label }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Chương</mat-label>
          <mat-select formControlName="chapter">
            <mat-option *ngFor="let c of chapters" [value]="c">{{ c === 0 ? 'Chưa phân loại' : c }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Độ khó</mat-label>
          <mat-select formControlName="difficulty">
            <mat-option *ngFor="let d of difficulties" [value]="d">{{ d }}</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <!-- MULTIPLE -->
      <div *ngIf="isMultiple" class="two-col mt-1">
        <mat-form-field appearance="outline"><mat-label>Lựa chọn A</mat-label><input matInput formControlName="optionA"></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Lựa chọn B</mat-label><input matInput formControlName="optionB"></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Lựa chọn C</mat-label><input matInput formControlName="optionC"></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Lựa chọn D</mat-label><input matInput formControlName="optionD"></mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Đáp án (A/B/C/D)</mat-label>
          <input matInput maxlength="1" formControlName="answer" placeholder="A/B/C/D">
          <mat-error *ngIf="form.get('answer')?.hasError('required')">Bắt buộc</mat-error>
          <mat-error *ngIf="form.get('answer')?.hasError('pattern')">Chỉ A/B/C/D</mat-error>
        </mat-form-field>
      </div>

      <!-- ESSAY -->
      <mat-form-field *ngIf="!isMultiple" appearance="outline" class="w-100 mt-1">
        <mat-label>Giải thích / đáp án</mat-label>
        <textarea matInput rows="2" formControlName="answerText"></textarea>
      </mat-form-field>
    </form>
  `,
  styles: [`
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    @media (max-width:768px){ .two-col{ grid-template-columns:1fr; } }
    .muted{ color:#6c757d; font-size:12px; }
  `]
})
export class QuestionFormComponent implements OnInit {
  @Input() value?: Partial<Question>;         // dữ liệu ban đầu (edit/clone)
  @Output() formReady = new EventEmitter<FormGroup>();

  form!: FormGroup;

  readonly questionTypes = [
    { value: 'MULTIPLE_CHOICE' as QuestionType, label: 'Trắc nghiệm' },
    { value: 'ESSAY' as QuestionType, label: 'Tự luận' },
  ];
  readonly difficulties = Object.values(Difficulty) as Difficulty[]; 
  readonly chapters: (0 | 1 | 2 | 3 | 4 | 5 | 6 | 7)[] = [0, 1, 2, 3, 4, 5, 6, 7];

  get isMultiple() { return this.form.get('questionType')?.value === 'MULTIPLE_CHOICE'; }
  get labels(): QuestionLabel[] { return this.form.get('labels')?.value ?? []; }

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    const q = this.value || {};
    this.form = this.fb.group({
      content: [q.content ?? '', [Validators.required, Validators.maxLength(10000)]],
      labels: [(q.labels as QuestionLabel[]) ?? ['PRACTICE']],
      questionType: [q.questionType ?? 'MULTIPLE_CHOICE', Validators.required],
      chapter: [q.chapter ?? 0],
      difficulty: [q.difficulty ?? 'C', Validators.required],
      optionA: [q.optionA ?? ''],
      optionB: [q.optionB ?? ''],
      optionC: [q.optionC ?? ''],
      optionD: [q.optionD ?? ''],
      answer: [q.answer ?? ''],
      answerText: [q.answerText ?? ''],
    });
    this.applyTypeValidators(this.form.get('questionType')!.value);
    this.form.get('questionType')!.valueChanges.subscribe(v => this.applyTypeValidators(v));
    this.formReady.emit(this.form);
  }

  private applyTypeValidators(type: QuestionType) {
    const a = this.form.get('optionA')!, b = this.form.get('optionB')!, c = this.form.get('optionC')!, d = this.form.get('optionD')!;
    const ans = this.form.get('answer')!, ansText = this.form.get('answerText')!;
    if (type === 'MULTIPLE_CHOICE') {
      a.setValidators([Validators.required]); b.setValidators([Validators.required]);
      c.setValidators([Validators.required]); d.setValidators([Validators.required]);
      ans.setValidators([Validators.required, Validators.pattern(/^[ABCD]$/)]); ansText.clearValidators();
    } else {
      a.clearValidators(); b.clearValidators(); c.clearValidators(); d.clearValidators();
      ans.clearValidators(); ansText.setValidators([]); // essay có thể rỗng
    }
    [a, b, c, d, ans, ansText].forEach(x => x.updateValueAndValidity());
  }

  toggleLabel(label: QuestionLabel, checked: boolean) {
    const set = new Set(this.labels);
    if (checked) set.add(label); else set.delete(label);
    const out = Array.from(set);
    this.form.get('labels')?.setValue(out.length ? out : ['PRACTICE']);
  }

  /** trả payload CreateQuestion từ form */
  toPayload(): CreateQuestion {
    const v = this.form.value;
    return {
      questionType: v.questionType,
      content: v.content,
      difficulty: v.difficulty,
      chapter: Number(v.chapter),
      optionA: v.optionA || '',
      optionB: v.optionB || '',
      optionC: v.optionC || '',
      optionD: v.optionD || '',
      answer: this.isMultiple ? (v.answer || '') : '',
      answerText: !this.isMultiple ? (v.answerText || '') : '',
      imageUrl: '',
      labels: (v.labels ?? []) as ('PRACTICE' | 'EXAM')[]
    };
  }
}
