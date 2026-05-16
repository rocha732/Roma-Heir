import { NgModule, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgChartsModule } from 'ng2-charts';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NotificationModalComponent } from './components/notification-modal/notification-modal.component';
import { ProcessingOverlayComponent } from './components/processing-overlay/processing-overlay.component';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

registerLocaleData(localeEs);

@NgModule({
  declarations: [
    AppComponent,
    NotificationModalComponent,
    ProcessingOverlayComponent
  ],
  imports: [
    BrowserModule,
    MatDatepickerModule,
    MatNativeDateModule,
    AppRoutingModule,
    HttpClientModule,
    NgChartsModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: LOCALE_ID,
      useValue: 'es-ES', // 👈 🔥 ESTA ES LA CLAVE
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
