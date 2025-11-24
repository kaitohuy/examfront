import { Injectable } from '@angular/core';
import { Notification } from '../models/notification';
import { Router, UrlTree } from '@angular/router';

/**
 * Chỉ map tối thiểu theo routes bạn đang có.
 * Khi cần tab/filter cụ thể, ta sẽ thêm query/payload sau.
 */
@Injectable({ providedIn: 'root' })
export class NotificationUrlResolverService {
  constructor(private router: Router) {}

  /** Trả về UrlTree để bạn router.navigateByUrl(tree) */
  buildUrl(notif: Notification, userRole: 'ADMIN' | 'HEAD' | 'TEACHER'): UrlTree {
    // Ưu tiên targetUrl từ BE (nếu đã có)
    if (notif.targetUrl && notif.targetUrl.trim()) {
      return this.router.parseUrl(notif.targetUrl);
    }

    const area = notif.appArea ?? this.roleToArea(userRole);
    const base = this.basePath(area);

    switch (notif.targetType) {
      case 'EXAM_TASK': {
        // Bạn chưa có route chi tiết theo taskId, nên đẩy về danh sách tasks
        // và (tương lai) có thể thêm ?focus=taskId nếu cần.
        return this.router.createUrlTree([base, 'tasks']);
      }

      case 'FILE_ARCHIVE': {
        // Mapping “vừa đủ xài” theo action:
        switch (notif.action) {
          case 'FILE_PENDING_REVIEW':
            // HEAD: vào trang pending moderation
            if (area === 'HEAD' || area === 'ADMIN') {
              return this.router.createUrlTree([this.basePath('HEAD'), 'archive', 'pending']);
            }
            // TEACHER: vào pending của GV
            return this.router.createUrlTree([this.basePath('TEACHER'), 'archive', 'pending']);

          case 'FILE_APPROVED':
            // GV xem file đã duyệt -> exports (hoặc submissions nếu đó là submission)
            // Chưa phân biệt EXPORT vs SUBMISSION ở FE, chọn exports để xem nhanh
            return this.router.createUrlTree([this.basePath('TEACHER'), 'archive', 'exports']);

          case 'FILE_REJECTED':
            // GV kiểm tra lại bài mình nộp
            return this.router.createUrlTree([this.basePath('TEACHER'), 'archive', 'submissions']);

          case 'FILE_DELETED':
            // Tất cả file của GV
            return this.router.createUrlTree([this.basePath('TEACHER'), 'archive', 'all']);

          default:
            // Fallback
            return this.router.createUrlTree([base, 'archive', 'all']);
        }
      }

      case 'QUESTION': {
        // Thiếu subjectId trong notif → quay về trang “overview” theo role
        // Sau này, nếu BE thêm subjectId vào payload/targetId, ta sẽ mở rộng:
        // e.g. [base, 'department', deptId, 'subjects', subjectId]
        if (area === 'TEACHER') {
          return this.router.createUrlTree([this.basePath('TEACHER'), 'overview']);
        } else if (area === 'HEAD' || area === 'ADMIN') {
          return this.router.createUrlTree([this.basePath('HEAD'), 'overview']);
        }
        return this.router.createUrlTree(['/login']);
      }

      default:
        // GENERIC / thiếu targetType → đưa về overview theo role
        return this.router.createUrlTree([base, 'overview']);
    }
  }

  /** Gọi điều hướng + (tuỳ chọn) markRead trước ở component */
  navigate(notif: Notification, userRole: 'ADMIN' | 'HEAD' | 'TEACHER') {
    const tree = this.buildUrl(notif, userRole);
    return this.router.navigateByUrl(tree);
  }

  private roleToArea(role: 'ADMIN' | 'HEAD' | 'TEACHER') {
    return role;
  }

  private basePath(area: 'ADMIN' | 'HEAD' | 'TEACHER') {
    switch (area) {
      case 'ADMIN': return '/admin-dashboard';
      case 'HEAD': return '/head-dashboard';
      default: return '/user-dashboard';
    }
  }
}
