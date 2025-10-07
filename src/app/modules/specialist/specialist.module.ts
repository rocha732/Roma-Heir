import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SpecialistRoutingModule } from './specialist-routing.module';
import { ViewSpecialistComponent } from './pages/view-specialist/view-specialist.component';


@NgModule({
  declarations: [
    ViewSpecialistComponent
  ],
  imports: [
    CommonModule,
    SpecialistRoutingModule
  ]
})
export class SpecialistModule { }
