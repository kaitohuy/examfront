import { Component } from '@angular/core';
import { GuidePageSharedComponent } from '../../../shared/guide-page-shared/guide-page-shared.component';
import { Topic } from '../../../shared/guide-types';

@Component({
  selector: 'app-guide-subject',
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
export class GuideSubjectComponent {
  topics: Topic[] = [
    {
      id: 'overview',
      title: 'Tổng quan',
      blocks: [
        { type: 'img', src: 'assets/images/guide/sj-tq.png', caption: 'Tổng quan Danh sách môn học' },
        { type: 'p', html: `<b>Quản lý môn học</b> cho phép ADMIN/HEAD tạo, sửa, xoá môn học và phân công giảng viên theo từng bộ môn (khoa).` },
        { type: 'ul', items: [
          '<b>Quyền:</b> ADMIN quản trị tất cả; HEAD chỉ trong khoa của mình.',
          'Bảng gồm: ID, Tên, Mã, Giảng viên, Hành động.',
          'Thanh tìm kiếm theo Tên/Mã; sắp xếp theo ID/Name/Code.'
        ]},
        { type: 'callout', tone: 'info', html: 'Đi từ “Quản lý khoa” → chọn 1 khoa → “Danh sách môn học” để thao tác trong ngữ cảnh bộ môn.' }
      ]
    },
    {
      id: 'create',
      title: 'Thêm môn học',
      blocks: [
        { type: 'h3', text: 'Các bước' },
        { type: 'ol', items: [
          'Nhấn <b>Thêm Môn học</b> ở góc phải trên.',
          'Điền <b>Tên</b> và <b>Mã</b> môn học (mã phải duy nhất).',
          'Nhấn <b>Lưu</b>.',
          'Sau khi tạo, hệ thống gợi ý <i>phân công giảng viên ngay</i>.'
        ]},
        { type: 'gallery', layout: 'one-per-row', images: [
          { src: 'assets/images/guide/sj-add-btn.png', caption: 'B1: Nút Thêm Môn học' },
          { src: 'assets/images/guide/sj-add-dialog.png', caption: 'B2: Dialog Thêm môn' }
        ]},
      ]
    },
    {
      id: 'edit',
      title: 'Chỉnh sửa môn học',
      blocks: [
        { type: 'p', html: 'Tại dòng môn học → Hành động → <b>Sửa</b> → điều chỉnh Tên/Mã rồi Lưu.' },
        { type: 'gallery', layout: 'one-per-row', images: [
          { src: 'assets/images/guide/sj-edit-btn.png', caption: 'Nút chỉnh sửa Môn học' },
          { src: 'assets/images/guide/sj-edit-dialog.png', caption: 'Mở dialog Sửa, Cập nhật thông tin & lưu' }
        ]}
      ]
    },
    {
      id: 'assign-teachers',
      title: 'Phân công giảng viên',
      blocks: [
        { type: 'h3', text: 'Chọn & lưu giảng viên' },
        { type: 'ol', items: [
          'Hành động → <b>Giảng viên</b> để mở dialog.',
          'Tìm theo tên/mã GV; tick chọn nhiều người.',
          'Nhấn <b>Lưu</b> để cập nhật (áp dụng theo diff: thêm mới/bỏ chọn).'
        ]},
        { type: 'gallery', layout: 'one-per-row', images: [
          { src: 'assets/images/guide/sj-at-btn.png', caption: 'Nút điều chỉnh giảng viên giảng dạy' },
          { src: 'assets/images/guide/sj-at-dialog.png', caption: 'Danh sách gv + tìm kiếm, Chọn nhiều & Lưu' },
        ]},
        { type: 'callout', tone: 'success', html: 'Sau khi lưu, danh sách giảng viên của môn được cập nhật ngay trên bảng.' }
      ]
    },
    {
      id: 'delete',
      title: 'Xoá môn học (cẩn trọng)',
      blocks: [
        { type: 'p', html: 'Chỉ xoá khi thật sự cần thiết. Hành động không thể hoàn tác.' },
        { type: 'ol', items: [
          'Hành động → <b>Xoá</b> → xác nhận trong hộp thoại cảnh báo.',
          'Nếu BE chặn do ràng buộc (ví dụ môn đang liên kết dữ liệu), hệ thống sẽ báo lỗi.'
        ]},
        { type: 'gallery', layout: 'one-per-row', images: [
          { src: 'assets/images/guide/sj-dlt-btn.png', caption: 'Nút xóa môn học' },
          { src: 'assets/images/guide/sj-dlt.png', caption: 'Hộp thoại xác nhận xoá' },
        ]},
      ]
    },
  ];
}
