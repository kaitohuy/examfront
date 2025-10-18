import { Routes } from '@angular/router';

import { SignupComponent } from './pages/signup/signup.component';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/admin/dashboard/dashboard.component';
import { UserDashboardComponent } from './pages/user/user-dashboard/user-dashboard.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { WelcomeComponent } from './pages/admin/welcome/welcome.component';
import { UserManagementComponent } from './pages/admin/user-management/user-management.component';
import { AddUserComponent } from './pages/admin/add-user/add-user.component';
import { ViewDepartmentComponent } from './pages/admin/view-department/view-department.component';
import { ViewSubjectComponent } from './pages/admin/view-subject/view-subject.component';
import { SubjectDetailComponent } from './pages/admin/subject-detail/subject-detail.component';
import { ArchiveFileComponent } from './pages/admin/archive-file/archive-file.component';
import { UserSubjectListComponent } from './pages/user/user-subject-list/user-subject-list.component';
import { UserSubjectDetailComponent } from './pages/user/user-subject-detail/user-subject-detail.component';
import { ArchiveHistoryComponent } from './pages/admin/archive-history/archive-history.component';
import { HeadDashboardComponent } from './pages/head/head-dashboard/head-dashboard.component';
import { HeadSubjectListComponent } from './pages/head/head-subject-list/head-subject-list.component';
import { HeadUserManagementComponent } from './pages/head/head-user-management/head-user-management.component';
import { blockLoginWhenAuthedGuard } from './services/home-redirect.guard.service';
import { roleGuard } from './services/role.guard.service';
import { EditProfileComponent } from './pages/edit-profile/edit-profile.component';
import { ForgotPasswordComponent } from './pages/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/auth/reset-password/reset-password.component';
import { GuideOverviewComponent } from './pages/guide/guide-overview.component';
import { GuideUserManagementComponent } from './pages/guide/guide-user-management/guide-user-management.component';
import { GuideLayoutComponent } from './pages/guide/guide-layout.component';
import { GuideDepartmentComponent } from './pages/guide/guide-department/guide-department.component';
import { GuideSubjectComponent } from './pages/guide/guide-subject/guide-subject.component';
import { GuideQuestionComponent } from './pages/guide/guide-question/guide-question.component';
import { GuideFileComponent } from './pages/guide/guide-file/guide-file.component';
import { AdminOverviewComponent } from './pages/admin/admin-overview/admin-overview.component';
import { HeadOverviewComponent } from './pages/head/head-overview/head-overview.component';
import { TeacherOverviewComponent } from './pages/user/teacher-overview/teacher-overview.component';
import { ExamTasksComponent } from './pages/tasks/exam-tasks/exam-tasks.component';
import { TrashQuestionComponent } from './pages/admin/trash-question/trash-question.component';

const GUIDE_CHILDREN: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  { path: 'overview', component: GuideOverviewComponent },
  {
    path: 'user-management', component: GuideUserManagementComponent,
    canActivate: [roleGuard(['ADMIN', 'HEAD'])]
  },
  {
    path: 'department', component: GuideDepartmentComponent,
    canActivate: [roleGuard(['ADMIN'])]
  },
  { path: 'subject', component: GuideSubjectComponent, canActivate: [roleGuard(['ADMIN', 'HEAD'])] },
  { path: 'question', component: GuideQuestionComponent },
  { path: 'file', component: GuideFileComponent },
];

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: 'login', component: LoginComponent, pathMatch: 'full',
    canActivate: [blockLoginWhenAuthedGuard], data: { hideNavbar: true, authBg: true }
  },
  {
    path: 'forgot-password', component: ForgotPasswordComponent,
    canActivate: [blockLoginWhenAuthedGuard], data: { hideNavbar: true, authBg: true }
  },
  {
    path: 'reset-password', component: ResetPasswordComponent,
    canActivate: [blockLoginWhenAuthedGuard], data: { hideNavbar: true, authBg: true }
  },
  {
    path: 'signup', component: SignupComponent, pathMatch: 'full',
    data: { hideNavbar: true, authBg: true }
  },

  // === ADMIN DASHBOARD ===
  {
    path: 'admin-dashboard',
    component: DashboardComponent,
    canActivate: [roleGuard(['ADMIN'])],
    canActivateChild: [roleGuard(['ADMIN'])],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      { path: 'overview', component: AdminOverviewComponent },
      { path: 'user-management', component: UserManagementComponent },
      { path: 'user-management/:id/edit', component: EditProfileComponent },
      { path: 'add-user', component: AddUserComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'profile/edit', component: EditProfileComponent },
      { path: 'department', component: ViewDepartmentComponent },
      { path: 'department/:departmentId/subjects', component: ViewSubjectComponent },
      { path: 'department/:departmentId/subjects/:subjectId', component: SubjectDetailComponent },
      { path: 'guide', component: GuideLayoutComponent, children: GUIDE_CHILDREN },
    ],
  },

  // === USER DASHBOARD (USER/TEACHER) ===
  {
    path: 'user-dashboard',
    component: UserDashboardComponent,
    canActivate: [roleGuard(['TEACHER'])],
    canActivateChild: [roleGuard(['TEACHER'])],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      { path: 'overview', component: TeacherOverviewComponent },
      { path: 'subjects', component: UserSubjectListComponent },
      { path: 'subjects/:subjectId', component: UserSubjectDetailComponent },
      { path: 'subjects/:subjectId/:tab', component: UserSubjectDetailComponent },
      { path: 'subjects/:subjectId/questions/trash', component: TrashQuestionComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'profile/edit', component: EditProfileComponent },
      {
        path: 'archive',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'all' },
          { path: 'all', component: ArchiveFileComponent, data: { kind: null } },
          { path: 'imports', component: ArchiveFileComponent, data: { kind: 'IMPORT' } },
          { path: 'exports', component: ArchiveFileComponent, data: { kind: 'EXPORT' } },
          { path: 'answers', component: ArchiveFileComponent, data: { kind: 'EXPORT', variant: 'ANSWER' } },
          { path: 'submissions', component: ArchiveFileComponent, data: { kind: 'SUBMISSION' } },
          { path: 'pending', component: ArchiveFileComponent, data: { kind: 'EXPORT', reviewStatus: 'PENDING' } },
          { path: 'history', component: ArchiveHistoryComponent, data: { kind: 'EXPORT', variant: 'EXAM' } },
        ],
      },
      {
        path: 'tasks', component: ExamTasksComponent
      },
      { path: 'guide', component: GuideLayoutComponent, children: GUIDE_CHILDREN },
    ],
  },

  // === HEAD DASHBOARD ===
  {
    path: 'head-dashboard',
    component: HeadDashboardComponent,
    canActivate: [roleGuard(['HEAD'])],
    canActivateChild: [roleGuard(['HEAD'])],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      { path: 'overview', component: HeadOverviewComponent },
      { path: 'department', component: HeadSubjectListComponent },
      { path: 'department/:departmentId/subjects/:subjectId', component: SubjectDetailComponent },
      { path: 'department/:departmentId/subjects/:subjectId/questions/trash', component: TrashQuestionComponent },
      { path: 'user-management', component: HeadUserManagementComponent },
      { path: 'user-management/:id/edit', component: EditProfileComponent },
      { path: 'add-user', component: AddUserComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'profile/edit', component: EditProfileComponent },
      {
        path: 'archive',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'all' },
          { path: 'all', component: ArchiveFileComponent, data: { kind: null } },
          { path: 'imports', component: ArchiveFileComponent, data: { kind: 'IMPORT' } },
          { path: 'exports', component: ArchiveFileComponent, data: { kind: 'EXPORT' } },
          { path: 'answers', component: ArchiveFileComponent, data: { kind: 'EXPORT', variant: 'ANSWER' } },
          { path: 'submissions', component: ArchiveFileComponent, data: { kind: 'SUBMISSION' } },
          { path: 'pending', component: ArchiveFileComponent, data: { kind: 'EXPORT', reviewStatus: 'PENDING', moderation: true } },
          { path: 'history', component: ArchiveHistoryComponent, data: { kind: 'EXPORT', variant: 'EXAM' } },
        ],
      },
      {
        path: 'tasks', component: ExamTasksComponent, 
      },
      { path: 'guide', component: GuideLayoutComponent, children: GUIDE_CHILDREN },
    ],
  },

  // Fallback: lỡ nhập URL sai cũng về login
  { path: '**', redirectTo: 'login' },
];
