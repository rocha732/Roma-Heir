import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GetReservations } from '../models/reservations';

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
}
