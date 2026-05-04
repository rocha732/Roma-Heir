import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './pages/home/home.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoginComponent } from '../auth/login/login.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { A11yModule } from '@angular/cdk/a11y';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { NgChartsModule } from 'ng2-charts';
import { DashboardComponent } from './pages/home/dashboard/dashboard.component';
import { CardCitasComponent } from 'src/app/components/card-citas/card-citas.component';
import { ViewUsersComponent } from './pages/home/users/view-users/view-users.component';
import { EditUserComponent } from './pages/home/users/edit-user/edit-user.component';
import { CreateUserComponent } from './pages/home/users/create-user/create-user.component';
import { FormInputComponent } from 'src/app/components/form-input/form-input.component';
import { ViewProductsComponent } from './pages/home/products/view-products/view-products.component';
import { CreateProductComponent } from './pages/home/products/create-product/create-product.component';
import { EditProductComponent } from './pages/home/products/edit-product/edit-product.component';
import { ProductCardComponent } from 'src/app/components/product-card/product-card.component';
import { CreateOrdersComponent } from './pages/home/orders/create-orders/create-orders.component';
import { EditOrdersComponent } from './pages/home/orders/edit-orders/edit-orders.component';
import { ViewOrdersComponent } from './pages/home/orders/view-orders/view-orders.component';
import { CreateReserveComponent } from './pages/home/reservations/create-reserve/create-reserve.component';
import { EditReserveComponent } from './pages/home/reservations/edit-reserve/edit-reserve.component';
import { ViewReservationsComponent } from './pages/home/reservations/view-reservations/view-reservations.component';
import { CalendarReservationsComponent } from './pages/home/reservations/calendar-reservations/calendar-reservations.component';
import { ServiceStylistsComponent } from './pages/home/services/service-stylists/service-stylists.component';
import { ViewServicesComponent } from './pages/home/services/view-services/view-services.component';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';

@NgModule({
  declarations: [
    HomeComponent,
    LoginComponent,
    DashboardComponent,
    CardCitasComponent,
    ViewUsersComponent,
    EditUserComponent,
    CreateUserComponent,
    ViewProductsComponent,
    ProductCardComponent,
    CreateProductComponent,
    EditProductComponent,
    FormInputComponent,
    CreateOrdersComponent,
    EditOrdersComponent,
    ViewOrdersComponent,
    CreateReserveComponent,
    EditReserveComponent,
    ViewReservationsComponent,
    CalendarReservationsComponent,
    ServiceStylistsComponent,
    ViewServicesComponent,
  ],
  imports: [
    CommonModule,
    HomeRoutingModule,
    FormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    A11yModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    NgChartsModule,
    ReactiveFormsModule,
    CalendarModule.forRoot({
      provide: DateAdapter,
      useFactory: adapterFactory,
    }),
  ],
})
export class HomeModule {}
