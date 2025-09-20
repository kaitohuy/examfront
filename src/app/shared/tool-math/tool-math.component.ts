import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface ToolItem {
  label: string;          // nhãn hiển thị
  tplLatex: string;       // mẫu LaTeX (có thể chứa ${sel}, ${cursor})
  inline?: boolean;       // true => bọc \( ... \); false => giữ display/block
  hint?: string;          // gợi ý/tooltip
}

export interface ToolCategory {
  name: string;
  items: ToolItem[];
}

@Component({
  selector: 'app-tool-math',
  standalone: true,
  imports: [CommonModule, MatMenuModule, MatIconModule, MatButtonModule],
  templateUrl: './tool-math.component.html',
  styleUrls: ['./tool-math.component.css']
})
export class ToolMathComponent {
  /** Giao diện gọn */
  @Input() dense = true;

  /** Đổi nhãn + icon viền tròn */
  @Input() label = 'tool Math';
  @Input() roundedIcon = true;

  /** Cho phép truyền danh mục từ ngoài, mặc định dùng bộ dưới */
  @Input() categories: ToolCategory[] = [];

  /** Phát sự kiện chèn: luôn xuất LaTeX */
  @Output() insert = new EventEmitter<{ tpl: string; inline: boolean }>();

  constructor() {
    if (!this.categories.length) {
      this.categories = this.buildDefaultCategories();
    }
  }

  onPick(item: ToolItem) {
    const inline = item.inline ?? true;
    const tpl = item.tplLatex || '';
    if (!tpl) return;
    this.insert.emit({ tpl, inline });
  }

  // ===== Bộ mặc định (có thể mở rộng dần) =====
  private buildDefaultCategories(): ToolCategory[] {
    return [
      {
        name: 'Đại số',
        items: [
          { label: 'frac', tplLatex: '\\frac{<tử>}{<mẫu>}' },
          { label: 'sqrt', tplLatex: '\\sqrt{<biểu thức>}' },
          { label: 'xᵢ',   tplLatex: '${sel}_{<chỉ số>}' },
          { label: 'xⁿ',   tplLatex: '${sel}^{<số mũ>}' },
          { label: 'sum',  tplLatex: '\\sum_{i=1}^{n}{<biểu thức>}' },
          { label: 'prod', tplLatex: '\\prod_{i=1}^{n}{<biểu thức>}' },
          { label: 'logₐ', tplLatex: '\\log_{<a>}(<x>)' },
        ]
      },
      {
        name: 'Lượng giác',
        items: [
          { label: 'sin', tplLatex: '\\sin(${sel})' },
          { label: 'cos', tplLatex: '\\cos(${sel})' },
          { label: 'tan', tplLatex: '\\tan(${sel})' },
          { label: 'π',   tplLatex: '\\pi' },
          { label: 'θ',   tplLatex: '\\theta' },
          { label: '°',   tplLatex: '^{\\circ}' },
        ]
      },
      {
        name: 'Giải tích',
        items: [
          { label: '∫',    tplLatex: '\\int_{a}^{b}{<f(x)>}\\,dx' },
          { label: '∮',    tplLatex: '\\oint_{C}{<f>}\\,dx' },
          { label: 'lim',  tplLatex: '\\lim_{x\\to a}{<f(x)>}' },
          { label: 'd/dx', tplLatex: '\\frac{d}{dx}{<f(x)>}' },
          { label: '∂/∂x', tplLatex: '\\frac{\\partial}{\\partial x}{<f(x,y)>}' },
        ]
      },
      {
        name: 'Logic/Tập hợp',
        items: [
          { label: '¬', tplLatex: '\\neg' },
          { label: '∧', tplLatex: '\\land' },
          { label: '∨', tplLatex: '\\lor' },
          { label: '⇒', tplLatex: '\\implies' },
          { label: '⇔', tplLatex: '\\iff' },
          { label: '∈', tplLatex: '\\in' },
          { label: '∉', tplLatex: '\\notin' },
          { label: '⊂', tplLatex: '\\subset' },
          { label: '⊆', tplLatex: '\\subseteq' },
          { label: '∪', tplLatex: '\\cup' },
          { label: '∩', tplLatex: '\\cap' },
        ]
      },
      {
        name: 'Ma trận/Véc-tơ',
        items: [
          { label: 'Matrix 2×2', tplLatex: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}', inline: false },
          { label: 'Matrix 3×3', tplLatex: '\\begin{bmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{bmatrix}', inline: false },
          { label: 'Vector',     tplLatex: '\\begin{bmatrix} a \\\\ b \\\\ c \\end{bmatrix}', inline: false },
          { label: 'det(A)',     tplLatex: '\\det(A)' },
        ]
      },
      {
        name: 'So sánh/Ký hiệu',
        items: [
          { label: '×', tplLatex: '\\times' },
          { label: '÷', tplLatex: '\\div' },
          { label: '≤', tplLatex: '\\le' },
          { label: '≥', tplLatex: '\\ge' },
          { label: '≠', tplLatex: '\\ne' },
          { label: '≈', tplLatex: '\\approx' },
          { label: '∞', tplLatex: '\\infty' },
          { label: '⋅', tplLatex: '\\cdot' },
        ]
      },
      {
        name: 'Chữ Hy Lạp',
        items: [
          { label: 'α', tplLatex: '\\alpha' },
          { label: 'β', tplLatex: '\\beta'  },
          { label: 'γ', tplLatex: '\\gamma' },
          { label: 'Δ', tplLatex: '\\Delta' },
          { label: 'λ', tplLatex: '\\lambda'},
          { label: 'Σ', tplLatex: '\\Sigma' },
          { label: 'μ', tplLatex: '\\mu'    },
          { label: 'Ω', tplLatex: '\\Omega' },
        ]
      }
    ];
  }
}
