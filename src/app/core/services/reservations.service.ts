import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  GetReservations,
  PutUpdateReservationDate,
  PutUpdateReservationStatus,
} from '../models/reservations';

@Injectable({
  providedIn: 'root',
})
export class ReservationsService {
  private apiUrl =
    'https://api-roma-mahair-dev-cqgmfch0fgf9fyev.canadacentral-01.azurewebsites.net/api';
  constructor(private http: HttpClient) {}

  getReservations(): Observable<GetReservations[]> {
    return this.http.get<GetReservations[]>(`${this.apiUrl}/Reservations`);
  }

  updateReservationStatus(id: number, body: { newStatusId: number }) {
  return this.http.patch(`${this.apiUrl}/Reservations/${id}/status`, body);
}

updateReservationDate(id: number, body: { reservedAt: string; hourAt: string }) {
  return this.http.put(`${this.apiUrl}/Reservations/${id}/dates`, body);
}

}
