import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { ReservarCitaClienteComponent } from '../appointments/reservar-cita-cliente/reservar-cita-cliente.component';

const routes: Routes = [  
  { path: 'dashboard', component: HomeComponent},
  {path: 'reservar-cita-cliente', component: ReservarCitaClienteComponent},
{ path: '', redirectTo: 'home', pathMatch: 'full' }, // redirigir al home por defecto
  { path: '', component: LoginComponent } // este se carga cuando visitas /home
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomeRoutingModule { }
