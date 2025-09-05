import { Component, Input, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import Swal from 'sweetalert2';
import { QuizService } from '../../../services/quiz.service';
import { sharedImports } from '../../../shared/shared-imports';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [
    ...sharedImports
  ],
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.css']
})
export class QuizComponent implements OnInit {
  @Input() subjectId!: number;
  @Input() departmentId!: number;
  quizzes: any[] = [];
  isLoadingQuizzes = true;
  sortField: string = '';
  sortDirection: 'asc' | 'desc' | '' = '';
  sortIcons: { [key: string]: string } = {
    id: 'bi bi-arrow-down-up',
    title: 'bi bi-arrow-down-up',
    description: 'bi bi-arrow-down-up',
    createdBy: 'bi bi-arrow-down-up',
    createdAt: 'bi bi-arrow-down-up'
  };
  @Input() searchText: string = '';

  constructor(
    private quizService: QuizService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadQuizzes();
  }

  loadQuizzes(): void {
    this.isLoadingQuizzes = true;
    this.quizService.listQuizzes(this.subjectId).subscribe({
      next: (data) => {
        this.quizzes = data;
        this.isLoadingQuizzes = false;
      },
      error: (err) => {
        this.showError('Lỗi khi tải danh sách quiz: ' + (err.error?.message || 'Không xác định'));
        this.isLoadingQuizzes = false;
      }
    });
  }

  openCreateQuizDialog(): void {
    Swal.fire({
      title: 'Thêm quiz mới',
      html: `
        <div class="swal-form">
          <div class="mb-3">
            <label for="title" class="form-label">Tên quiz</label>
            <input type="text" id="title" class="swal2-input" placeholder="Nhập tên quiz" required>
          </div>
          <div class="mb-3">
            <label for="description" class="form-label">Mô tả</label>
            <textarea id="description" class="swal2-textarea" placeholder="Nhập mô tả"></textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Thêm',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        const title = (document.getElementById('title') as HTMLInputElement).value;
        const description = (document.getElementById('description') as HTMLTextAreaElement).value;
        if (!title) {
          Swal.showValidationMessage('Tên quiz là bắt buộc');
          return false;
        }
        return { title, description };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.createQuiz(result.value);
      }
    });
  }

  createQuiz(payload: any): void {
    this.quizService.createQuiz(this.subjectId, payload).subscribe({
      next: (data) => {
        this.quizzes.push(data);
        this.showSuccess('Thêm quiz thành công');
      },
      error: (err) => {
        this.showError('Lỗi khi thêm quiz: ' + (err.error?.message || 'Không xác định'));
      }
    });
  }

  openEditQuizDialog(quiz: any): void {
    Swal.fire({
      title: 'Chỉnh sửa quiz',
      html: `
        <div class="swal-form">
          <div class="mb-3">
            <label for="title" class="form-label">Tên quiz</label>
            <input type="text" id="title" class="swal2-input" value="${quiz.title}" required>
          </div>
          <div class="mb-3">
            <label for="description" class="form-label">Mô tả</label>
            <textarea id="description" class="swal2-textarea">${quiz.description || ''}</textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Cập nhật',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        const title = (document.getElementById('title') as HTMLInputElement).value;
        const description = (document.getElementById('description') as HTMLTextAreaElement).value;
        if (!title) {
          Swal.showValidationMessage('Tên quiz là bắt buộc');
          return false;
        }
        return { title, description };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.editQuiz(quiz.id, result.value);
      }
    });
  }

  editQuiz(quizId: number, payload: any): void {
    this.quizService.updateQuiz(this.subjectId, quizId, payload).subscribe({
      next: (data) => {
        const index = this.quizzes.findIndex(q => q.id === quizId);
        if (index !== -1) {
          this.quizzes[index] = data;
        }
        this.showSuccess('Cập nhật quiz thành công');
      },
      error: (err) => {
        this.showError('Lỗi khi cập nhật quiz: ' + (err.error?.message || 'Không xác định'));
      }
    });
  }

  deleteQuiz(quizId: number): void {
    Swal.fire({
      title: 'Xác nhận xóa',
      text: 'Bạn có chắc chắn muốn xóa quiz này?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        this.quizService.deleteQuiz(this.subjectId, quizId).subscribe({
          next: () => {
            this.quizzes = this.quizzes.filter(q => q.id !== quizId);
            this.showSuccess('Xóa quiz thành công');
          },
          error: (err) => {
            this.showError('Lỗi khi xóa quiz: ' + (err.error?.message || 'Không xác định'));
          }
        });
      }
    });
  }

  sortQuizzes(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.updateSortIcons();
    this.applySort();
  }

  updateSortIcons(): void {
    Object.keys(this.sortIcons).forEach(key => {
      this.sortIcons[key] = 'bi bi-arrow-down-up';
    });
    if (this.sortField && this.sortDirection) {
      this.sortIcons[this.sortField] = this.sortDirection === 'asc' ? 'bi bi-sort-down' : 'bi bi-sort-up';
    }
  }

  applySort(): void {
    if (!this.sortField) return;
    this.quizzes.sort((a, b) => {
      const valueA = a[this.sortField];
      const valueB = b[this.sortField];
      if (valueA < valueB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      } else if (valueA > valueB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  get filteredQuizzes(): any[] {
    if (!this.searchText) {
      return this.quizzes;
    }
    const term = this.searchText.toLowerCase();
    return this.quizzes.filter(quiz =>
      quiz.title.toLowerCase().includes(term) ||
      quiz.description?.toLowerCase().includes(term)
    );
  }

  showSuccess(message: string): void {
    this.snackBar.open(message, 'Đóng', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Đóng', {
      duration: 3000,
      panelClass: ['error-snackbar']
    });
  }
}
