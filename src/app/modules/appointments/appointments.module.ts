import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AppointmentsRoutingModule } from './appointments-routing.module';
import { ReservarCitaClienteComponent } from './reservar-cita-cliente/reservar-cita-cliente.component';


@NgModule({
  declarations: [
    ReservarCitaClienteComponent
  ],
  imports: [
    CommonModule,
    AppointmentsRoutingModule
  ]
})
export class AppointmentsModule { }
