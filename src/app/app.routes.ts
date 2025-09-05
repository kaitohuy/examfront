import { Routes } from '@angular/router';
import { SignupComponent } from './pages/signup/signup.component';
import { LoginComponent } from './pages/login/login.component';
import { HomeComponent } from './pages/home/home.component';
import { DashboardComponent } from './pages/admin/dashboard/dashboard.component';
import { UserDashboardComponent } from './pages/user/user-dashboard/user-dashboard.component';
import { adminGuard } from './services/admin.guard';
import { normalGuard } from './services/normal.guard';
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
import { headGuard } from './services/head.guard';
import { HeadSubjectListComponent } from './pages/head/head-subject-list/head-subject-list.component';
import { HeadUserManagementComponent } from './pages/head/head-user-management/head-user-management.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    pathMatch: 'full',
  },
  {
    path: 'signup',
    component: SignupComponent,
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
    pathMatch: 'full',
  },
  {
    path: 'admin',
    component: DashboardComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        component: WelcomeComponent,
      },
      {
        path: 'user-management',
        component: UserManagementComponent
      },
      {
        path: 'add-user',
        component: AddUserComponent,
      },
      {
        path: 'profile',
        component: ProfileComponent,
      },
      {
        path: 'department',
        component: ViewDepartmentComponent
      },
      {
        path: 'department/:departmentId/subjects',
        component: ViewSubjectComponent
      },
      {
        path: 'department/:departmentId/subjects/:subjectId',
        component: SubjectDetailComponent
      },
      {
        path: 'archive',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'all' },
          { path: 'all', component: ArchiveFileComponent, data: { kind: null } },
          { path: 'imports', component: ArchiveFileComponent, data: { kind: 'IMPORT' } },
          { path: 'exports', component: ArchiveFileComponent, data: { kind: 'EXPORT' } },
          {
            path: 'pending',
            component: ArchiveFileComponent,
            data: { kind: 'EXPORT', reviewStatus: 'PENDING', moderation: true }
          },
          { path: 'history', component: ArchiveHistoryComponent, data: { kind: 'EXPORT', variant: 'EXAM' } }
        ]
      },
    ]
  },
  {
    path: 'user-dashboard',
    component: UserDashboardComponent,
    canActivate: [normalGuard],
    canActivateChild: [normalGuard],
    children: [
      { path: 'subjects', component: UserSubjectListComponent },
      { path: 'subjects/:subjectId', component: UserSubjectDetailComponent },
      {
        path: 'archive',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'all' },
          { path: 'all', component: ArchiveFileComponent, data: { kind: null } },
          { path: 'imports', component: ArchiveFileComponent, data: { kind: 'IMPORT' } },
          { path: 'exports', component: ArchiveFileComponent, data: { kind: 'EXPORT' } },
          // User pending: KHÔNG đặt moderation => chỉ View/Delete (không approve/reject)
          { path: 'pending', component: ArchiveFileComponent, data: { kind: 'EXPORT', reviewStatus: 'PENDING' } },
          { path: 'history', component: ArchiveHistoryComponent, data: { kind: 'EXPORT', variant: 'EXAM' } }
        ]
      },
    ],
  },
  {
    path: 'head-dashboard',
    component: HeadDashboardComponent,
    canActivate: [headGuard],
    canActivateChild: [headGuard],
    children: [
      { path: 'department', component: HeadSubjectListComponent },
      { path: 'department/:departmentId/subjects/:subjectId', component: SubjectDetailComponent },
      { path: 'user-management', component: HeadUserManagementComponent },
      {
        path: 'archive',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'all' },
          { path: 'all', component: ArchiveFileComponent, data: { kind: null } },
          { path: 'imports', component: ArchiveFileComponent, data: { kind: 'IMPORT' } },
          { path: 'exports', component: ArchiveFileComponent, data: { kind: 'EXPORT' } },
          // User pending: KHÔNG đặt moderation => chỉ View/Delete (không approve/reject)
          { path: 'pending', component: ArchiveFileComponent, data: { kind: 'EXPORT', reviewStatus: 'PENDING', moderation: true } },
          { path: 'history', component: ArchiveHistoryComponent, data: { kind: 'EXPORT', variant: 'EXAM' } }
        ]
      },
    ],
  }
];
