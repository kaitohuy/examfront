import { Component } from '@angular/core';
import { GuidePageSharedComponent } from '../../../shared/guide-page-shared/guide-page-shared.component';
import { Topic } from '../../../shared/guide-types';

@Component({
  selector: 'app-guide-department',
  standalone: true,
  imports: [GuidePageSharedComponent],
  template: `
    <app-guide-page-shared
      [topics]="topics"
      [ctaText]="'Mở trang Quản lý khoa'"
      [ctaLink]="['/admin-dashboard','department']">
    </app-guide-page-shared>
  `,
})
export class GuideDepartmentComponent {
  topics: Topic[] = [
    {
      id: 'overview',
      title: 'Tổng quan',
      blocks: [
        { type: 'img', src: 'assets/images/guide/dept-tq.png', caption: 'Màn hình Quản lý Bộ môn' },
        { type: 'p', html: 'Chức năng <b>Quản lý Bộ môn</b> chỉ dành cho <b>ADMIN</b>.' },
        {
          type: 'ul', items: [
            'Nút <b>Thêm Bộ môn</b> ở góc phải.',
            'Ô <b>Tìm kiếm</b> theo tên/mô tả/Trưởng bộ môn.',
            'Bảng có thể <b>sắp xếp</b> theo ID, Tên, Mô tả, Trưởng bộ môn.',
            'Click một <b>hàng</b> để đi đến danh sách <i>môn học</i> của bộ môn đó.'
          ]
        },
        { type: 'callout', tone: 'info', html: 'Click vào hàng để chuyển tới trang quản lý từng môn học.' }
      ]
    },
    {
      id: 'add',
      title: 'Thêm bộ môn',
      blocks: [
        { type: 'h3', text: 'Các bước' },
        {
          type: 'ol', items: [
            'Nhấn <b>Thêm Bộ môn</b>.',
            'Điền <b>Tên</b> (bắt buộc) và <b>Mô tả</b> (tuỳ chọn).',
            'Ô <b>Trưởng bộ môn</b>: gõ để tìm theo Họ tên/username/ID/teacherCode (chỉ gợi ý role TEACHER).',
            'Nhấn <b>Lưu</b>.'
          ]
        },
        {
          type: 'gallery', layout: 'one-per-row', images: [
            { src: 'assets/images/guide/dept-ad-btn.png', caption: 'B1: Nút Thêm Bộ môn' },
            { src: 'assets/images/guide/dept-af.png', caption: 'B2: Form tạo mới' },
            { src: 'assets/images/guide/dept-ah.png', caption: 'B3: Chọn Trưởng bộ môn' },
          ]
        },
        { type: 'callout', tone: 'warning', html: 'Có thể <b>để trống HEAD</b> nếu chưa phân công.' },
      ]
    },
    {
      id: 'edit',
      title: 'Sửa thông tin bộ môn',
      blocks: [
        { type: 'p', html: 'Trong cột <b>Hành động</b>, chọn <b>Sửa</b> để cập nhật Tên/Mô tả/HEAD.' },
        {
          type: 'gallery', layout: 'one-per-row', images: [
            { src: 'assets/images/guide/dept-edit-btn.png', caption: 'Mở dialog Sửa' },
            { src: 'assets/images/guide/dept-edit-form.png', caption: 'Form cập nhật thông tin' },
          ]
        },
        { type: 'callout', tone: 'info', html: 'Bấm biểu tượng <b>(x)</b> ở ô HEAD để <i>gỡ HEAD</i>.' },
      ]
    },
    {
      id: 'goto-subjects',
      title: 'Xem danh sách môn học',
      blocks: [
        { type: 'p', html: 'Trong bảng, <b>click vào một hàng</b> để chuyển tới danh sách môn học thuộc bộ môn đó.' },
        { type: 'callout', tone: 'info', html: 'CLick vào trang hướng dẫn riêng cho <b>Quản lý môn học</b>.' },
      ]
    },
    {
      id: 'delete',
      title: 'Xoá bộ môn (cẩn trọng)',
      blocks: [
        {
          type: 'ol', items: [
            'Trong cột Hành động chọn <b>Xoá</b>.',
            'Xác nhận trên hộp thoại cảnh báo (SweetAlert).'
          ]
        },
        {
          type: 'gallery', layout: 'one-per-row', images: [
            { src: 'assets/images/guide/dept-dlt-btn.png', caption: 'Nút xoá' },
            { src: 'assets/images/guide/dept-dlt.png', caption: 'Xác nhận xoá' },
          ]
        },
        { type: 'callout', tone: 'warning', html: 'Hành động <b>không thể hoàn tác</b>. Cân nhắc kỹ trước khi xoá.' },
      ]
    },
  ];
}