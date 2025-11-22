import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { DashboardComponent } from './pages/home/dashboard/dashboard.component';
import { AuthGuard } from '../../core/guards/auth.guard';
import { ViewUsersComponent } from './pages/home/users/view-users/view-users.component';
import { CreateUserComponent } from './pages/home/users/create-user/create-user.component';
import { EditUserComponent } from './pages/home/users/edit-user/edit-user.component';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [AuthGuard],
      },
      { path: 'users/view-users', component: ViewUsersComponent },
      { path: 'users/create-user', component: CreateUserComponent },
      { path: 'users/edit-user', component: EditUserComponent }, // :id para editar
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HomeRoutingModule {}
