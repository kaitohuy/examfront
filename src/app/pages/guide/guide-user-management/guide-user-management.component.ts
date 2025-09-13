import { Component } from '@angular/core';
import { GuidePageSharedComponent } from '../../../shared/guide-page-shared/guide-page-shared.component';
import { Topic } from '../../../shared/guide-types';

@Component({
  selector: 'app-guide-user-management',
  standalone: true,
  imports: [GuidePageSharedComponent],
  template: `
    <app-guide-page-shared
      [topics]="topics"
      [ctaText]="'Mở trang Quản lý nhân sự'"
      [ctaLink]="['/admin-dashboard','user-management']">
    </app-guide-page-shared>
  `,
})
export class GuideUserManagementComponent {
  topics: Topic[] = [
    {
      id: 'overview',
      title: 'Tổng quan',
      blocks: [
        { type: 'img', src: 'assets/images/guide/um-tq.png', alt: 'Tổng quan' },
        {
          type: 'p', html: `<b>Quản lý nhân sự</b> cho phép ADMIN/HEAD xem, tìm kiếm, lọc, xuất Excel,
          thêm/sửa người dùng, gán & gỡ HEAD, reset mật khẩu hoặc xóa người dùng.` },
        {
          type: 'ul', items: [
            '<b>Phạm vi quyền:</b> ADMIN quản trị toàn hệ thống; HEAD trong khoa của mình.',
            '<b>Sắp xếp:</b> nhấp tiêu đề cột có biểu tượng sort (ID, Mã GV, Họ tên).',
            '<b>Tìm kiếm:</b> theo tài khoản, email, họ tên.',
            '<b>Lọc nhanh:</b> theo Giảng viên / Trưởng bộ môn.'
          ]
        },
      ]
    },
    {
      id: 'add',
      title: 'Thêm giảng viên',
      blocks: [
        { type: 'h3', text: 'Các bước' },
        {
          type: 'ol', items: [
            'Nhấn <b>Thêm giảng viên</b> ở góc phải trên.',
            'Điền Tài khoản, Họ tên, Email, chọn Khoa/Bộ môn.',
            'Chọn <b>Vai trò</b> ban đầu (thường là <code>TEACHER</code>).',
            'Nhấn <b>Lưu</b>.'
          ]
        },
        {
          type: 'gallery', layout: 'one-per-row', images: [
            { src: 'assets/images/guide/um-au-btn.png', caption: 'B1: Nút thêm' },
            { src: 'assets/images/guide/um-au.png', caption: 'B2: Form nhập' },
          ]
        },
        { type: 'callout', tone: 'warning', html: 'Nhớ kiểm tra Mã giảng viên, username, điện thoại, email để tránh trùng lặp tài khoản.' }
      ]
    },
    {
      id: 'edit',
      title: 'Sửa hồ sơ',
      blocks: [
        { type: 'p', html: 'Ở dòng người dùng → menu <b>Hành động</b> → chọn <b>Sửa</b> → Giao diện sửa thông tin user hiển thị.' },
        {
          type: 'gallery', layout: 'one-per-row', images: [
            { src: 'assets/images/guide/um-action.png', caption: 'B1: Nút hành động' },
            { src: 'assets/images/guide/um-edit.png', caption: 'B2: Form chỉnh sửa thông tin' },
          ]
        },
      ]
    },
    {
      id: 'assign-head',
      title: 'Gán/Gỡ HEAD',
      blocks: [
        { type: 'h3', text: 'Gán HEAD' },
        {
          type: 'ol', items: [
            'Chọn người dùng role <code>TEACHER</code> → Hành động → <b>Gán HEAD</b>.',
            'Chọn Bộ môn/Khoa cần gán và xác nhận.'
          ]
        },
        {
          type: 'gallery', layout: 'one-per-row', images: [
            { src: 'assets/images/guide/um-action.png', caption: 'B1: Nút gán HEAD' },
            { src: 'assets/images/guide/um-ah.png', caption: 'B2: Chọn khoa' },
          ]
        },
        { type: 'h3', text: 'Gỡ HEAD' },
        { type: 'p', html: 'Ở người dùng role <code>HEAD</code> → Hành động → <b>Gỡ HEAD</b>.' },
        { type: 'img', src: 'assets/images/guide/um-dh.png', caption: 'Nút gỡ HEAD' },
      ]
    },
    {
      id: 'reset',
      title: 'Reset mật khẩu',
      blocks: [
        {
          type: 'ol', items: [
            'Hành động → <b>Reset mật khẩu</b>.',
            'Hệ thống gán mật khẩu mặc định (ví dụ <code>123abc</code>) và hiển thị thông báo.',
            'Khuyến nghị người dùng đổi lại mật khẩu sau khi đăng nhập.'
          ]
        },
        { type: 'img', src: 'assets/images/guide/um-rs-pw.png', caption: 'Nút khôi phục mật khẩu' },
      ]
    },
    {
      id: 'search-filter',
      title: 'Tìm kiếm, lọc & xuất Excel',
      blocks: [
        {
          type: 'ul', items: [
            '<b>Tìm kiếm:</b> gõ từ khóa vào ô “Tìm kiếm người dùng…”.',
            '<b>Lọc:</b> bấm Lọc → chọn <i>Giảng viên</i> / <i>Trưởng bộ môn</i>.',
          ]
        },
        { type: 'img', src: 'assets/images/guide/um-search.png', caption: 'B1: Thanh tìm kiếm và bộ lọc' },
        { type: 'p', html: '<b>Xuất Excel:</b> nhấn <b>Xuất excel</b> để tải file CSV.' },
        { type: 'img', src: 'assets/images/guide/um-scv.png', caption: 'B1: Nút xuất file excel' },
      ]
    },
    {
      id: 'delete',
      title: 'Xóa người dùng (cẩn trọng)',
      blocks: [
        { type: 'p', html: 'Chỉ xóa khi thật sự cần thiết. Hành động này không thể hoàn tác.' },
        {
          type: 'ol', items: [
            'Hành động → <b>Xóa người dùng</b>.',
            'Xác nhận trong hộp thoại cảnh báo.'
          ]
        },
        {
          type: 'gallery', layout: 'one-per-row', images: [
            { src: 'assets/images/guide/um-action.png', caption: 'B1: Nút xóa người dùng' },
            { src: 'assets/images/guide/um-dlt.png', caption: 'B2: Xác nhận xóa' },
          ]
        },
      ]
    }
  ];
}
