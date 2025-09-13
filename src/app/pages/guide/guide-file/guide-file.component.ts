import { Component } from '@angular/core';
import { GuidePageSharedComponent } from '../../../shared/guide-page-shared/guide-page-shared.component';
import { Topic } from '../../../shared/guide-types';

@Component({
  selector: 'app-guide-file',
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
export class GuideFileComponent {
  topics: Topic[] = [
    {
      id: 'overview',
      title: 'Tổng quan',
      blocks: [
        { type: 'img', src: 'assets/images/guide/ar-tq.png', caption: 'Kho đề theo môn & loại file' },
        { type: 'p', html: `<b>Kho đề</b> là nơi tập trung các tệp đề (nhập từ file hoặc xuất từ câu hỏi). Hỗ trợ tìm kiếm, lọc, xem, tải, duyệt/hủy (moderation) và lịch sử.` },
        {
          type: 'ul', items: [
            '<b>Đối tượng:</b> ADMIN, HEAD (duyệt file từ teacher); TEACHER (xem/tải các file được duyệt, quản lý file của mình).',
            '<b>Loại:</b> <b>IMPORT</b> (tệp nhập vào) và <b>EXPORT</b> (tệp xuất ra).',
            '<b>Phân loại cho EXPORT:</b> Câu hỏi ôn tập / Câu hỏi thi.'
          ]
        },
      ]
    },
    {
      id: 'view-download',
      title: 'Xem trước & Tải file',
      blocks: [
        {
          type: 'gallery', layout: 'one-per-row', images: [
            { src: 'assets/images/guide/ar-view.png', caption: 'Xem nhanh file' },
            { src: 'assets/images/guide/ar-download.png', caption: 'Tải về (chỉ khi Approved)' }
          ]
        },
        {
          type: 'ul', items: [
            '<b>Xem</b>: mở tab mới. Với DOC/DOCX/PPT/XLS, hệ thống tự dùng <i>Office Viewer</i> để hiển thị.',
            '<b>Tải</b>: chỉ hiển thị khi file đã <b>APPROVED</b>.'
          ]
        },
        { type: 'callout', tone: 'warning', html: 'Nếu trình duyệt chặn pop-up, hãy cho phép trang mở tab mới để xem/tải file.' }
      ]
    },
    {
      id: 'moderation',
      title: 'Duyệt/Hủy',
      blocks: [
        { type: 'img', src: 'assets/images/guide/ar-moderation.png', caption: 'Chế độ duyệt: View / Approve / Reject' },
        {
          type: 'ol', items: [
            'Mở <b>Pending</b> để xem các file chờ duyệt.',
            'Chọn <b>Duyệt</b> để chuyển sang trạng thái APPROVED.',
            'Chọn <b>Hủy</b> để từ chối: nhập <i>lý do</i> và có thể đặt <i>hạn xử lý</i> (4h/8h/24h/3d/7d hoặc tự nhập).'
          ]
        },
        { type: 'callout', tone: 'info', html: 'Khi <b>Reject</b>, hệ thống lưu <i>reviewNote</i> và <i>reviewDeadline</i> để tiện theo dõi/nhắc.' }
      ]
    },
    {
      id: 'delete-rules',
      title: 'Quy tắc xoá file',
      blocks: [
        {
          type: 'ul', items: [
            '<b>ADMIN/HEAD</b>: xoá mọi file.',
            '<b>TEACHER</b>: chỉ xoá <u>file của mình</u>.',
            '<b>EXPORT</b> của TEACHER: <i>không</i> xoá khi file đã <b>APPROVED</b> (chỉ xoá PENDING/REJECTED).',
            '<b>IMPORT</b> của TEACHER: có thể xoá file của mình.'
          ]
        },
        { type: 'callout', tone: 'warning', html: 'Xoá là thao tác không thể hoàn tác. Hãy kiểm tra kỹ trước khi xác nhận.' }
      ]
    },
    {
      id: 'status-icons',
      title: 'Trạng thái & biểu tượng',
      blocks: [
        {
          type: 'ul', items: [
            '<b>Kind</b>: <code>IMPORT</code> (màu xanh) / <code>EXPORT</code> (màu vàng).',
            '<b>Variant</b> (EXPORT): <i>Practice</i> (màu xanh dương nhạt) / <i>Exam</i> (màu xanh dương).',
            '<b>Status</b>: APPROVED (xanh), REJECTED (đỏ), PENDING (xám). Hover để xem lý do/hạn nếu bị từ chối.',
            '<b>GCS</b>: biểu tượng đám mây — <i>cloud_done</i> (có trên GCS) / <i>cloud_off</i> (thiếu).'
          ]
        },
        { type: 'img', src: 'assets/images/guide/ar-badges.png', caption: 'Badge kind/variant/status & cloud health' }
      ]
    },
    {
      id: 'pending-notify',
      title: 'Thông báo Pending & nhắc lại',
      blocks: [
        { type: 'p', html: 'Ở tab <b>Pending</b>, có thể <b>Bật thông báo</b> lại khi trước đó đã tạm ẩn. Tính năng này giúp HEAD/ADMIN không bỏ lỡ đề chờ duyệt.' },
        { type: 'img', src: 'assets/images/guide/ar-reset-snooze.png', caption: 'Nút “Bật thông báo” cho Pending' }
      ]
    },
    {
      id: 'history',
      title: 'Lịch sử duyệt (Exam)',
      blocks: [
        { type: 'img', src: 'assets/images/guide/ar-history.png', caption: 'Trang lịch sử duyệt đề thi' },
        {
          type: 'ul', items: [
            'Lọc theo trạng thái <b>Approved/Rejected</b>, môn học, thời gian, tên file.',
            'Xem <b>người duyệt</b>, <b>thời điểm duyệt</b>; nhấp dòng để xem chi tiết (lý do/Deadline nếu Rejected).',
            'Có thể <b>Xem</b> hoặc <b>Tải</b> file trực tiếp từ lịch sử.'
          ]
        }
      ]
    },
  ];

}
