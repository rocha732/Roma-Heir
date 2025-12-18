import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { DashboardComponent } from './pages/home/dashboard/dashboard.component';
import { AuthGuard } from '../../core/guards/auth.guard';
import { ViewUsersComponent } from './pages/home/users/view-users/view-users.component';
import { CreateUserComponent } from './pages/home/users/create-user/create-user.component';
import { EditUserComponent } from './pages/home/users/edit-user/edit-user.component';
import { ViewProductsComponent } from './pages/home/products/view-products/view-products.component';
import { CreateProductComponent } from './pages/home/products/create-product/create-product.component';
import { EditProductComponent } from './pages/home/products/edit-product/edit-product.component';
import { ViewOrdersComponent } from './pages/home/orders/view-orders/view-orders.component';
import { CreateOrdersComponent } from './pages/home/orders/create-orders/create-orders.component';
import { EditOrdersComponent } from './pages/home/orders/edit-orders/edit-orders.component';
import { ViewReservationsComponent } from './pages/home/reservations/view-reservations/view-reservations.component';
import { EditReserveComponent } from './pages/home/reservations/edit-reserve/edit-reserve.component';
import { CreateReserveComponent } from './pages/home/reservations/create-reserve/create-reserve.component';
import { CalendarReservationsComponent } from './pages/home/reservations/calendar-reservations/calendar-reservations.component';

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
      {
        path: 'users/view-users',
        component: ViewUsersComponent,
        canActivate: [AuthGuard],
      },
      {
        path: 'users/create-user',
        component: CreateUserComponent,
        canActivate: [AuthGuard],
      },
      {
        path: 'users/edit-user',
        component: EditUserComponent,
      },
      {
        path: 'users/edit-user/:id',
        component: EditUserComponent,
      },
      { path: 'users/view-users', component: ViewUsersComponent },
      { path: 'users/create-user', component: CreateUserComponent },
      { path: 'users/edit-user', component: EditUserComponent }, // :id para editar
      { path: 'products/view-products', component: ViewProductsComponent },
      { path: 'products/create-product', component: CreateProductComponent },
      { path: 'products/edit-product', component: EditProductComponent },
      { path: 'products/edit-product/:id', component: EditProductComponent },
      { path: 'orders/view-orders', component: ViewOrdersComponent },
      { path: 'orders/create-orders', component: CreateOrdersComponent },
      { path: 'orders/edit-orders', component: EditOrdersComponent },
      { path: 'orders/edit-orders/:id', component: EditOrdersComponent },
      { path: 'reservations/view-reservations', component: ViewReservationsComponent},
      { path: 'reservations/edit-reserve/:id', component: EditReserveComponent},
      { path: 'reservations/edit-reserve', component: EditReserveComponent},
      { path: 'reservations/create-reserve', component: CreateReserveComponent },
      {path: 'reservations/calendar-reservations', component: CalendarReservationsComponent}
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HomeRoutingModule {}
