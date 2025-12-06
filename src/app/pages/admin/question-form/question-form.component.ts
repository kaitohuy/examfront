import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { sharedImports } from '../../../shared/shared-imports';
import { QuestionType } from '../../../models/questionType';
import { Difficulty } from '../../../models/difficulty';
import { CreateQuestion } from '../../../models/createQuestion';
import { Question } from '../../../models/question';

import { MathjaxDirective } from '../../../shared/mathjax.directive';
import { ToolMathComponent } from '../../../shared/tool-math/tool-math.component';

type QuestionLabel = 'PRACTICE' | 'EXAM';
type TexField = 'content' | 'optionA' | 'optionB' | 'optionC' | 'optionD' | 'answer' | 'answerText';

@Component({
  selector: 'app-question-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ...sharedImports,
    MathjaxDirective,
    ToolMathComponent
  ],
  templateUrl: './question-form.component.html',
  styleUrls: ['./question-form.component.css']
})
export class QuestionFormComponent implements OnInit, OnChanges {
  @Input() value?: Partial<Question>;
  @Output() formReady = new EventEmitter<FormGroup>();

  form!: FormGroup;

  // Options
  readonly questionTypes = [
    { value: 'MULTIPLE_CHOICE' as QuestionType, label: 'Trắc nghiệm' },
    { value: 'ESSAY' as QuestionType, label: 'Tự luận' },
  ];

  readonly diffOptions: Array<{ value: Difficulty; label: string }> = [
    { value: 'A' as Difficulty, label: '5 điểm' },
    { value: 'B' as Difficulty, label: '4 điểm' },
    { value: 'C' as Difficulty, label: '3 điểm' },
    { value: 'D' as Difficulty, label: '2 điểm' },
    { value: 'E' as Difficulty, label: '1 điểm' },
  ];

  readonly chapters: (0 | 1 | 2 | 3 | 4 | 5 | 6 | 7)[] = [0, 1, 2, 3, 4, 5, 6, 7];
  readonly labelOptions: Array<{ value: QuestionLabel; label: string }> = [
    { value: 'PRACTICE', label: 'Ôn tập' },
    { value: 'EXAM', label: 'Thi cử' }
  ];

  // [NEW] Options cho ItemNature
  readonly natureOptions = [
    { value: 'THEORY', label: 'Lý thuyết' },
    { value: 'EXERCISE', label: 'Bài tập' }
  ];

  // Tool Math state
  focused: { field: TexField } | null = null;

  constructor(private fb: FormBuilder) { }

  // ==== Getters ====
  get isMultiple() { return this.form.get('questionType')?.value === 'MULTIPLE_CHOICE'; }
  get labels(): QuestionLabel[] { return this.form.get('labels')?.value ?? []; }

  // ==== Lifecycle ====
  ngOnInit(): void {
    this.buildForm(this.value || {});
    this.formReady.emit(this.form);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.form) {
      this.patchForm(this.value || {});
    }
  }

  // ==== Form Build & Patch ====
  private buildForm(q: Partial<Question>) {
    // Nếu BE trả về typeCode/itemNature lồng trong meta, ta lấy an toàn
    const typeCode = q.typeCode ?? (q as any).meta?.typeCode ?? '';
    const itemNature = q.itemNature ?? (q as any).meta?.itemNature ?? null;

    this.form = this.fb.group({
      content: [q.content ?? '', [Validators.required, Validators.maxLength(10000)]],
      labels: [(q.labels as QuestionLabel[]) ?? ['PRACTICE']],
      questionType: [q.questionType ?? 'MULTIPLE_CHOICE', Validators.required],
      chapter: [q.chapter ?? 0],
      difficulty: [q.difficulty ?? ('C' as Difficulty), Validators.required],
      
      // [NEW] Fields
      typeCode: [typeCode],
      itemNature: [itemNature],

      optionA: [q.optionA ?? ''],
      optionB: [q.optionB ?? ''],
      optionC: [q.optionC ?? ''],
      optionD: [q.optionD ?? ''],
      answer: [q.answer ?? ''],
      answerText: [q.answerText ?? ''],
    });

    this.applyTypeValidators(this.form.get('questionType')!.value);
    this.form.get('questionType')!.valueChanges.subscribe((v: QuestionType) => this.applyTypeValidators(v));
  }

  private patchForm(q: Partial<Question>) {
    const typeCode = q.typeCode ?? (q as any).meta?.typeCode ?? '';
    const itemNature = q.itemNature ?? (q as any).meta?.itemNature ?? null;

    this.form.patchValue({
      content: q.content ?? '',
      labels: (q.labels as QuestionLabel[]) ?? ['PRACTICE'],
      questionType: q.questionType ?? 'MULTIPLE_CHOICE',
      chapter: q.chapter ?? 0,
      difficulty: q.difficulty ?? ('C' as Difficulty),
      
      // [NEW]
      typeCode: typeCode,
      itemNature: itemNature,

      optionA: q.optionA ?? '',
      optionB: q.optionB ?? '',
      optionC: q.optionC ?? '',
      optionD: q.optionD ?? '',
      answer: q.answer ?? '',
      answerText: q.answerText ?? '',
    }, { emitEvent: false });
    this.applyTypeValidators(this.form.get('questionType')!.value);
  }

  private applyTypeValidators(type: QuestionType) {
    const a = this.form.get('optionA')!, b = this.form.get('optionB')!, c = this.form.get('optionC')!, d = this.form.get('optionD')!;
    const ans = this.form.get('answer')!, ansText = this.form.get('answerText')!;
    
    if (type === 'MULTIPLE_CHOICE') {
      a.setValidators([Validators.required]);
      b.setValidators([Validators.required]);
      c.setValidators([Validators.required]);
      d.setValidators([Validators.required]);
      ans.setValidators([Validators.required, Validators.pattern(/^[ABCD]$/)]);
      ansText.clearValidators();
    } else {
      a.clearValidators(); b.clearValidators(); c.clearValidators(); d.clearValidators();
      ans.clearValidators(); 
      ansText.setValidators([]); 
    }
    
    [a, b, c, d, ans, ansText].forEach(x => x.updateValueAndValidity());
  }

  // ==== Labels Helper ====
  toggleLabel(label: QuestionLabel, checked: boolean) {
    const set = new Set(this.labels);
    if (checked) set.add(label); else set.delete(label);
    const out = Array.from(set);
    this.form.get('labels')?.setValue(out.length ? out : ['PRACTICE']);
  }

  // ==== Tool Math Logic ====
  setFocus(field: TexField) { this.focused = { field }; }

  private elBy(field: TexField): HTMLTextAreaElement | HTMLInputElement | null {
    return document.getElementById(`tex-${field}`) as any;
  }

  insertToFocused(rawTpl: string, inline = true) {
    if (!this.focused) return;
    this.insertTpl(this.focused.field, rawTpl, inline);
  }

  insertTpl(field: TexField, rawTpl: string, inline = true) {
    const el = this.elBy(field);
    const cur: string = this.form.get(field)?.value || '';

    let selStart = cur.length, selEnd = cur.length;
    if (el) {
      selStart = (el as any).selectionStart ?? cur.length;
      selEnd = (el as any).selectionEnd ?? cur.length;
    }
    const selected = cur.slice(selStart, selEnd);

    let tpl = rawTpl.replaceAll('${sel}', selected || '');
    if (inline) {
      if (!(tpl.startsWith('\\(') && tpl.endsWith('\\)'))) tpl = `\\(${tpl}\\)`;
    }

    let caretOffset = tpl.indexOf('${cursor}');
    if (caretOffset >= 0) tpl = tpl.replace('${cursor}', '');
    else caretOffset = tpl.length;

    const next = cur.slice(0, selStart) + tpl + cur.slice(selEnd);
    this.form.get(field)?.setValue(next);

    const pos = selStart + caretOffset;
    setTimeout(() => {
      if (!el) return;
      el.focus();
      (el as any).setSelectionRange(pos, pos);
    });
  }

  // ==== Public API for Parent Dialog ====
  toPayload(): CreateQuestion {
    const v = this.form.value;
    return {
      questionType: v.questionType,
      content: v.content,
      difficulty: v.difficulty,
      chapter: Number(v.chapter),
      
      // [NEW] Map to DTO
      typeCode: v.typeCode?.trim() || null,
      itemNature: v.itemNature || null,

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