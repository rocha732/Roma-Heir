import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  catchError,
  forkJoin,
  map,
  Observable,
  of,
} from 'rxjs';
import { GetReservations } from '../models/reservations';
import { SalonServiceBrief } from '../models/salon-service';

export interface ServiceMonthlySummary {
  serviceId: number;
  stylists: any[];
  monthlyReservations: number;
  monthlyStylistsCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class SalonServicesService {
  private apiUrl =
    'https://api-roma-mahair-dev-cqgmfch0fgf9fyev.canadacentral-01.azurewebsites.net/api';

  constructor(private http: HttpClient) {}

  /** Lista de servicios (si existe en el backend). */
  getServices(): Observable<SalonServiceBrief[]> {
    return this.http.get<SalonServiceBrief[]>(`${this.apiUrl}/Services`);
  }

  /** Stylists asociados a un servicio */
  getServiceStylists(serviceId: number): Observable<unknown[]> {
    return this.http.get<unknown[]>(
      `${this.apiUrl}/Services/${serviceId}/stylists`
    );
  }

  /** Agrega especialista/stylist al servicio */
  assignStylist(serviceId: number, stylistId: number): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.apiUrl}/Services/${serviceId}/stylists/${stylistId}`,
      {}
    );
  }

  /** Quita especialista/stylist del servicio */
  removeStylist(serviceId: number, stylistId: number): Observable<unknown> {
    return this.http.delete<unknown>(
      `${this.apiUrl}/Services/${serviceId}/stylists/${stylistId}`
    );
  }

  getServiceMonthlySummary(
    serviceId: number,
    referenceDate: Date = new Date()
  ): Observable<ServiceMonthlySummary> {
    return forkJoin({
      stylistsResponse: this.getServiceStylists(serviceId).pipe(
        catchError(() => of([]))
      ),
      reservations: this.http
        .get<GetReservations[]>(`${this.apiUrl}/Reservations`)
        .pipe(catchError(() => of([]))),
    }).pipe(
      map(({ stylistsResponse, reservations }) => {
        const stylists = this.normalizeStylistsResponse(stylistsResponse);

        const monthlyReservations = reservations.filter((reservation) => {
          const reservationDate = new Date(reservation.reservedAt);

          return (
            reservation?.service?.id === serviceId &&
            reservationDate.getMonth() === referenceDate.getMonth() &&
            reservationDate.getFullYear() ===
              referenceDate.getFullYear()
          );
        });

        const stylistsWithReservations = new Set<number>();

        monthlyReservations.forEach((reservation) => {
          if (reservation.specialistId) {
            stylistsWithReservations.add(
              reservation.specialistId
            );
          }
        });

        return {
          serviceId,
          stylists,
          monthlyReservations: monthlyReservations.length,
          monthlyStylistsCount:
            stylistsWithReservations.size,
        };
      })
    );
  }

  private normalizeStylistsResponse(
    response: unknown
  ): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (
      response &&
      typeof response === 'object' &&
      Array.isArray((response as any).stylists)
    ) {
      return (response as any).stylists;
    }

    return [];
  }
}
