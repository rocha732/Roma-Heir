import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SalonServiceBrief } from '../models/salon-service';

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
}
