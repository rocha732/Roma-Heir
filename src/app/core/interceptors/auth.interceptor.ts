import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {

    const token = localStorage.getItem('token');
    console.log('[AuthInterceptor] Token actual:', token);

    let authReq = req;
    if (token) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    } else {
      console.warn('[AuthInterceptor] No se encontró token en localStorage');
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          console.error('[AuthInterceptor] Error 401 detectado:', error);
          alert('Sesión expirada. Por favor, inicia sesión nuevamente.');
          localStorage.clear();
          this.router.navigate(['/']);
        } else {
          console.error('[AuthInterceptor] Error detectado:', error);
        }

        return throwError(() => error);
      })
    );
  }
}
