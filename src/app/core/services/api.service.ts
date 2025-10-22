import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = 'https://api-roma-mahair-dev-cqgmfch0fgf9fyev.canadacentral-01.azurewebsites.net/api';
  constructor(private http: HttpClient) {}

  getReservations(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Reservations`);
  }

  getSpecialists(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Specialists`);
  }

  postRegisterClient(client: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Account/register`, client);
  }

  postverifyClient(client: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Account/verify`, client);
  }

  getCustomers(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Customers`);
  }

  getBusinessHours(businessId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/BusinessHours/${businessId}`);
  }

  login(data: any) {
    return this.http.post<any>(`${this.apiUrl}/Auth/login`, data);
  }

  verifyCode(data: any) {
    return this.http.post<any>(`${this.apiUrl}/Auth/verify-code`, data);
  }

  postReservation(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Reservations`, data);
  }

  getStatusReservations(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reservation-statuses`);
  }

  patchReservationStatus(
    reservationId: number,
    newStatusId: any
  ): Observable<any> {
    return this.http.patch<any>(
      `${this.apiUrl}/Reservations/${reservationId}/status`,
      newStatusId
    );
  }

  putNewReservation(
    reservationId: number,
    updatedReservation: any
  ): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/Reservations/${reservationId}/dates`,
      updatedReservation
    );
  }
  getOrders(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Orders`);
  }
  getOrderDetails(orderId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Orders/${orderId}/details`);
  }
   getProducts(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Products`);
  }
  putOrderPayment(orderId: number): Observable<any> {
  return this.http.put<any>(`${this.apiUrl}/Orders/${orderId}/pays`, {});
}

}
