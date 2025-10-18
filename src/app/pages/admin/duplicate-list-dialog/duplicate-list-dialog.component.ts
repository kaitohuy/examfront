import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { sharedImports } from '../../../shared/shared-imports';
import { QuestionService } from '../../../services/question.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { Question } from '../../../models/question';

type TexField = 'content' | 'answerText' | 'optionA' | 'optionB' | 'optionC' | 'optionD';

type Item = {
  id: number;
  loading: boolean;
  saving?: boolean;
  deleting?: boolean;
  error?: string;

  /** Nếu là “câu” thì data chứa Question để xem/sửa nhanh */
  data?: Question;

  /** Nếu là “bundle” thì bundle chứa DTO (đủ để hiển thị) */
  bundle?: {
    id: number;
    title?: string;
    instructions?: string | null;
    items?: Array<{
      questionId: number;
      orderIndex: number;
      pointsOverride?: number | null;
      note?: string | null;
    }>;
  };

  // edit inline (chỉ dùng cho "question mode")
  editing?: boolean;
  form?: {
    questionType: 'MULTIPLE_CHOICE' | 'ESSAY';
    difficulty: 'A' | 'B' | 'C' | 'D' | 'E';
    chapter: number;
    content: string;
    optionA?: string; optionB?: string; optionC?: string; optionD?: string;
    answer?: string;
    answerText?: string;
    labels?: ('PRACTICE' | 'EXAM')[];
  };
};

@Component({
  selector: 'app-duplicate-list-dialog',
  standalone: true,
  imports: [MatDialogModule, ...sharedImports],
  templateUrl: './duplicate-list-dialog.component.html',
  styleUrls: ['./duplicate-list-dialog.component.css']
})
export class DuplicateListDialogComponent {
  items: Item[] = [];
  subjectId!: number;
  questionMap = new Map<number, Question>(); // questionId -> Question
  isBundleMode = false;

  diffOptions = [
    { value: 'A' as const, label: '5 điểm' },
    { value: 'B' as const, label: '4 điểm' },
    { value: 'C' as const, label: '3 điểm' },
    { value: 'D' as const, label: '2 điểm' },
    { value: 'E' as const, label: '1 điểm' },
  ];
  chapters: Array<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7> = [0, 1, 2, 3, 4, 5, 6, 7];
  labelOptions = [
    { value: 'PRACTICE' as const, label: 'Ôn tập' },
    { value: 'EXAM' as const, label: 'Thi cử' },
  ];

  // tool-math chèn vào ô đang focus
  focused: { id: number; field: TexField } | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { subjectId: number; ids: number[]; score?: number; mode?: 'question' | 'bundle' },
    private ref: MatDialogRef<DuplicateListDialogComponent>,
    private qs: QuestionService
  ) {
    this.subjectId = data.subjectId;
    const ids = Array.isArray(data.ids) ? data.ids : [];
    this.items = ids.map((id) => ({ id, loading: true }));
    this.isBundleMode = (data.mode === 'bundle');

    if (!ids.length) return;

    if (!this.isBundleMode) {
      // ===== CHẾ ĐỘ CÂU HỎI =====
      forkJoin(
        ids.map((id) =>
          this.qs.getQuestion(this.subjectId, id).pipe(
            map((data) => ({ id, ok: true, data })),
            catchError(() => of({ id, ok: false }))
          )
        )
      ).subscribe((rows) => {
        rows.forEach((r: any) => {
          const it = this.items.find((x) => x.id === r.id);
          if (!it) return;
          it.loading = false;
          if (r.ok) it.data = r.data; else it.error = 'Không tải được dữ liệu';
        });
      });
    } else {
      // ===== CHẾ ĐỘ BUNDLE =====
      this.qs.lookupBundles(this.subjectId, ids).subscribe({
        next: (bundles: any[]) => {
          // gắn bundle theo đúng thứ tự id
          const map: Record<number, any> = {};
          for (const b of bundles || []) map[b.id] = b;

          // gom tất cả questionId bên trong bundle
          const qIds: number[] = [];
          this.items.forEach((it) => {
            const b = map[it.id];
            it.loading = false;
            if (!b) { it.error = 'Không tải được dữ liệu'; return; }
            it.bundle = b;
            (b.items || []).forEach((bi: any) => qIds.push(bi.questionId));
          });

          // tải nội dung các câu trong bundle
          const uniq = Array.from(new Set(qIds));
          if (!uniq.length) return;

          this.qs.lookupQuestions(this.subjectId, uniq).subscribe({
            next: (qs: Question[]) => {
              for (const q of qs) this.questionMap.set(q.id!, q);
              // đặt “data” = câu đầu tiên để dùng preview nhanh
              for (const it of this.items) {
                const firstId = it.bundle?.items?.[0]?.questionId;
                if (firstId) it.data = this.questionMap.get(firstId) || undefined;
              }
            },
            error: () => { /* không chặn UI; HTML sẽ hiện '(Không lấy được nội dung câu)' */ }
          });
        },
        error: () => {
          for (const it of this.items) { it.loading = false; it.error = 'Không tải được dữ liệu'; }
        }
      });
    }
  }

  close() { this.ref.close(); }

  // ===== Inline edit (only question mode) =====
  toggleEdit(it: Item) {
    if (this.isBundleMode) return; // chặn trong bundle mode
    if (!it.data) return;
    it.editing = !it.editing;
    if (it.editing) {
      it.form = {
        questionType: it.data.questionType,
        difficulty: it.data.difficulty,
        chapter: it.data.chapter ?? 0,
        content: it.data.content ?? '',
        optionA: it.data.optionA ?? '',
        optionB: it.data.optionB ?? '',
        optionC: it.data.optionC ?? '',
        optionD: it.data.optionD ?? '',
        answer: it.data.answer ?? '',
        answerText: it.data.answerText ?? '',
        labels: (it.data.labels as any) ?? ['PRACTICE']
      };
      // focus vào content
      setTimeout(() => {
        const el = document.getElementById(this.inputId(it.id, 'content')) as HTMLTextAreaElement | null;
        if (el) {
          el.focus();
          const pos = el.value?.length ?? 0;
          el.setSelectionRange(pos, pos);
        }
        this.focused = { id: it.id, field: 'content' };
      });
    } else {
      this.focused = null;
    }
  }

  inputId(id: number, field: TexField) { return `dup-${field}-${id}`; }

  setFocus(id: number, field: TexField) {
    this.focused = { id, field };
  }

  insertToFocused(rawTpl: string, inline = true) {
    if (!this.focused) return;
    const it = this.items.find(x => x.id === this.focused!.id);
    if (!it?.form) return;

    const field = this.focused.field;
    const el = document.getElementById(this.inputId(it.id, field)) as any;
    const cur = (it.form as any)[field] ?? '';

    let selStart = cur.length, selEnd = cur.length;
    if (el) {
      selStart = el.selectionStart ?? cur.length;
      selEnd = el.selectionEnd ?? cur.length;
    }
    const selected = cur.slice(selStart, selEnd);

    let tpl = rawTpl.replaceAll('${sel}', selected || '');
    if (inline) {
      if (!(tpl.startsWith('\\(') && tpl.endsWith('\\)'))) tpl = `\\(${tpl}\\)`;
    }

    let caretOffset = tpl.indexOf('${cursor}');
    if (caretOffset >= 0) tpl = tpl.replace('${cursor}', ''); else caretOffset = tpl.length;

    const next = cur.slice(0, selStart) + tpl + cur.slice(selEnd);
    (it.form as any)[field] = next;

    const pos = selStart + caretOffset;
    setTimeout(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  save(it: Item) {
    if (this.isBundleMode) return; // chặn trong bundle mode
    if (!it.form) return;
    it.saving = true;

    const payload: any = {
      questionType: it.form.questionType,
      difficulty: it.form.difficulty,
      chapter: it.form.chapter,
      content: it.form.content,
      labels: it.form.labels ?? ['PRACTICE']
    };
    if (it.form.questionType === 'MULTIPLE_CHOICE') {
      payload.optionA = it.form.optionA;
      payload.optionB = it.form.optionB;
      payload.optionC = it.form.optionC;
      payload.optionD = it.form.optionD;
      payload.answer = it.form.answer;
    } else {
      payload.answerText = it.form.answerText ?? '';
    }

    // 👇 PASS image = null (đủ 4 tham số)
    this.qs.updateQuestion(this.subjectId, it.id, payload, null).subscribe({
      next: async (updated) => {
        it.data = updated;
        it.editing = false;
        it.saving = false;
        await Swal.fire({ icon: 'success', title: 'Đã lưu thay đổi', timer: 1200, showConfirmButton: false });
      },
      error: async () => {
        it.saving = false;
        await Swal.fire({ icon: 'error', title: 'Lưu thất bại', text: 'Vui lòng thử lại.' });
      }
    });
  }

  async onDelete(it: Item) {
    if (this.isBundleMode) return; // chặn trong bundle mode
    if (!it?.id) return;
    const { isConfirmed } = await Swal.fire({
      icon: 'warning', title: `Xoá câu #${it.id}?`,
      text: 'Thao tác này không thể hoàn tác.',
      showCancelButton: true, confirmButtonText: 'Xoá', cancelButtonText: 'Huỷ'
    });
    if (!isConfirmed) return;

    it.deleting = true;
    this.qs.deleteQuestion(this.subjectId, it.id).subscribe({
      next: async () => {
        this.items = this.items.filter((x) => x.id !== it.id);
        await Swal.fire({ icon: 'success', title: `Đã xoá #${it.id}`, timer: 1200, showConfirmButton: false });
      },
      error: async () => {
        it.deleting = false;
        await Swal.fire({ icon: 'error', title: 'Xoá thất bại', text: `Không thể xoá câu #${it.id}` });
      }
    });
  }
}
