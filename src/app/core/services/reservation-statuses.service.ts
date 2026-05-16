import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { getReservationStatuses } from '../models/reservation-statuses';

@Injectable({
  providedIn: 'root'
})
export class ReservationStatusesService {
 private apiUrl =
    'https://api-roma-mahair-dev-cqgmfch0fgf9fyev.canadacentral-01.azurewebsites.net/api';
  constructor(private http: HttpClient) {}

    getStatusReservations(): Observable<getReservationStatuses[]> {
    return this.http.get<getReservationStatuses[]>(`${this.apiUrl}/reservation-statuses`);
  }
}
