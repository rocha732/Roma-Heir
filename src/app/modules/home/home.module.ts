import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './pages/home/home.component';
import { FormsModule } from '@angular/forms';
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

@NgModule({
  declarations: [HomeComponent, LoginComponent, DashboardComponent, CardCitasComponent],
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
  ],
})
export class HomeModule {}
