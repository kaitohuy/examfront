import { Component } from '@angular/core';
import { GuidePageSharedComponent } from '../../../shared/guide-page-shared/guide-page-shared.component';
import { Topic } from '../../../shared/guide-types';

@Component({
  selector: 'app-guide-question',
  standalone: true,
  imports: [GuidePageSharedComponent],
  template: `
    <app-guide-page-shared
      [topics]="topics"
      [ctaText]="''"
      [ctaLink]="['']">
    </app-guide-page-shared>
  `,
})
export class GuideQuestionComponent {
  topics: Topic[] = [
    {
      id: 'overview',
      title: 'Tổng quan',
      blocks: [
        { type: 'img', src: 'assets/images/guide/qm-tq.png', caption: 'Trang Quản lý Câu hỏi theo môn', captionAt: 'below' },
        { type: 'p', html: `<b>Quản lý câu hỏi</b> cho phép ADMIN/HEAD tạo, sửa, xoá, nhập/xuất, nhân bản, quản lý bản sao; lọc theo nhãn <code>PRACTICE/EXAM</code> qua 2 tab.` },
        {
          type: 'ul', items: [
            '<b>Quyền:</b> Chức năng dành cho ADMIN & HEAD.',
            '<b>Tabs:</b> Ôn tập (Practice) & Thi cử (Exam) lọc theo nhãn.',
            '<b>Hiển thị đáp án:</b> với câu hỏi Thi cử có thể bị hạn chế (yêu cầu HEAD/ADMIN).'
          ]
        },
        { type: 'callout', tone: 'info', html: 'Vào từ: Quản lý khoa → chọn 1 khoa → Danh sách môn → chọn 1 môn.' }
      ]
    },
    {
      id: 'create',
      title: 'Thêm câu hỏi mới',
      blocks: [
        { type: 'h3', text: 'Các bước' },
        {
          type: 'ol', items: [
            'Nhấn <b>Thêm Câu hỏi</b>.',
            'Điền <b>Nội dung</b>, chọn <b>Nhãn</b> (PRACTICE/EXAM), <b>Loại</b>, <b>Chương</b>, <b>Độ khó</b>.',
            'Nếu <i>Trắc nghiệm</i>: điền A–D và đáp án (A/B/C/D). Nếu <i>Tự luận</i>: điền Giải thích/đáp án.',
            'Tuỳ chọn tải <b>Hình ảnh</b> minh hoạ.',
            'Nhấn <b>Thêm</b>.'
          ]
        },
        {
          type: 'gallery', layout: 'one-per-row', images: [
            { src: 'assets/images/guide/qm-aq-btn.png', caption: 'Nút thêm câu hỏi' },
            { src: 'assets/images/guide/qm-aq-dialog.png', caption: 'Dialog thêm câu hỏi' }
          ]
        },
      ]
    },

    {
      id: 'edit',
      title: 'Chỉnh sửa câu hỏi',
      blocks: [
        { type: 'p', html: 'Nhấn <b>Sửa</b> ở dòng câu hỏi → cập nhật nội dung, nhãn, loại, chương, độ khó, đáp án/giải thích, ảnh… → <b>Cập nhật</b>.' },
        {
          type: 'gallery', layout: 'one-per-row', images: [
            { src: 'assets/images/guide/qm-eq-btn.png', caption: 'Nút sửa câu hỏi' },
            { src: 'assets/images/guide/qm-eq-dialog.png', caption: 'Dialog sửa câu hỏi' }
          ]
        },
      ]
    },

    {
      id: 'clone',
      title: 'Nhân bản câu hỏi & quản lý bản sao',
      blocks: [
        {
          type: 'ol', items: [
            'Nhấn <b>Nhân bản</b> → nhập số lượng, chọn <i>Sao chép hình ảnh</i> (nếu cần).',
            'Sau khi tạo, có thể <b>Sửa nhanh</b> nhiều bản sao trong 1 dialog (điền đáp án/hệ số…).',
            'Trong thẻ “Bản sao”: xem, sửa, xoá từng bản sao.'
          ]
        },
        {
          type: 'gallery', layout: 'one-per-row', images: [
            { src: 'assets/images/guide/qm-cq-btn.png', caption: 'Nút nhân bản' },
            { src: 'assets/images/guide/qm-cq-num.png', caption: 'Nhập số lượng nhân bản' },
            { src: 'assets/images/guide/qm-cq-dialog.png', caption: 'Sửa nhanh các bản sao' },
            { src: 'assets/images/guide/qm-cl-lt-btn.png', caption: 'Nút xem bản sao' },
            { src: 'assets/images/guide/qm-cl-lt.png', caption: 'Danh sách bản sao theo câu gốc' }
          ]
        },
        { type: 'callout', tone: 'info', html: 'Nếu không thấy hiển thị số lượng bản sao, reset lại trang' }
      ]
    },

    {
      id: 'answers-visibility',
      title: 'Bật/tắt Hiển thị đáp án',
      blocks: [
        { type: 'p', html: 'Dùng <b>Hiện/Ẩn đáp án</b> để xem đáp án & giải thích. Với tab Thi cử, có thể yêu cầu quyền HEAD/ADMIN.' },
        {
          type: 'gallery', layout: 'one-per-row', images: [
            { src: 'assets/images/guide/qm-ans.png', caption: 'Nút xem đáp án' },
            { src: 'assets/images/guide/qm-ans-role.png', caption: 'Đối với câu hỏi thi, muốn xem đáp án cần sự cho phép của head/admin' }
          ]
        },
        { type: 'callout', tone: 'warning', html: 'Nếu bạn không có quyền mà bật hiển thị, hệ thống sẽ chặn & nhắc quyền hạn.' }
      ]
    },
    {
      id: 'bulk',
      title: 'Chọn hàng loạt & thao tác gộp',
      blocks: [
        {
          type: 'ul', items: [
            'Checkbox đầu dòng để chọn lẻ.',
            '<b>Chọn tất cả trang này</b> để chọn nhanh các mục đang hiển thị.',
            '<b>Thanh gộp</b> cho phép Export/Xoá hàng loạt hoặc bỏ chọn.'
          ]
        },
        {
          type: 'gallery', layout: 'one-per-row', images: [
            { src: 'assets/images/guide/qm-cb-btn.png', caption: 'Nút chọn câu hỏi muốn thao tác' },
            { src: 'assets/images/guide/qm-cb-action.png', caption: 'Thanh thao tác khi đã chọn nhiều' },
          ]
        },
      ]
    },
    {
      id: 'import',
      title: 'Nhập câu hỏi từ file (.docx/.pdf)',
      blocks: [
        { type: 'h3', text: 'Bản xem trước & gán nhãn per-block' },
        {
          type: 'ol', items: [
            'Nhấn <b>Tải câu hỏi lên</b> → chọn tệp (.docx/.pdf).',
            'Nếu muốn đẩy file lên kho lưu trữ → tick chọn <b>Lưu vào kho chung</b>',
            'Hệ thống tạo <b>Bản xem trước</b>: mỗi block là 1 câu hỏi → chọn <i>Loại</i>, <i>Chương</i>, <i>Độ khó</i>, <i>Nhãn</i>, chỉnh nội dung bằng RTE.',
            'Tick chọn ảnh đính kèm (nếu có).',
            'Nhấn <b>Xác nhận các mục đã chọn</b> để nhập vào hệ thống.'
          ]
        },
        {
          type: 'gallery', layout: 'one-per-row', images: [
            { src: 'assets/images/guide/qm-ip-btn.png', caption: 'Nút import file câu hỏi' },
            { src: 'assets/images/guide/qm-ip-dialog.png', caption: 'tải file từ máy lên' },
            { src: 'assets/images/guide/qm-ip-ed.png', caption: 'Bản xem trước: chỉnh từng câu hỏi + nội dung' }
          ]
        },
        { type: 'callout', tone: 'info', html: 'Bạn có thể “Chọn tất cả” hoặc chỉ nhập một phần các câu hỏi.' }
      ]
    },
    {
      id: 'export',
      title: 'Xuất câu hỏi đã chọn (PDF/DOCX)',
      blocks: [
        {
          type: 'ul', items: [
            '<b>Chọn câu hỏi</b> bằng checkbox (có thanh hành động gộp khi đã chọn).',
            'Nhấn <b>Xuất câu hỏi về</b> → chọn định dạng <i>PDF/DOCX</i>.',
            '<b>Practice:</b> chọn form (Trắc nghiệm/Tự luận), cấp đào tạo, tuỳ chọn lưu bản sao vào kho.',
            '<b>Exam:</b> nhập thông tin header đề (học kỳ, năm học, lớp, thời lượng, hình thức thi, bộ môn, mẫu…).',
            '<b>Include answers:</b> chọn kèm đáp án/giải thích vào file xuất.'
          ]
        },
        {
          type: 'gallery', layout: 'one-per-row', images: [
            { src: 'assets/images/guide/qm-cb-action.png', caption: 'Thanh thao tác khi đã chọn nhiều' },
            { src: 'assets/images/guide/qm-ep-dialog.png', caption: 'Bản xem trước: chỉnh từng câu hỏi + nội dung' }
          ]
        },
        { type: 'callout', tone: 'success', html: 'Tên file có thể tự đặt; hệ thống tự gợi ý đuôi .pdf/.docx nếu bạn bỏ trống.' }
      ]
    },
  ];
}
