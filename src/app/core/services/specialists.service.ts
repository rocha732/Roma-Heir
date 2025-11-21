import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GetSpecialists } from '../models/specialists';

@Injectable({
  providedIn: 'root'
})
export class SpecialistsService {
private apiUrl = 'https://api-roma-mahair-dev-cqgmfch0fgf9fyev.canadacentral-01.azurewebsites.net/api';
  constructor(private http: HttpClient) {}

  getSpecialists(): Observable<GetSpecialists[]> {
    return this.http.get<GetSpecialists[]>(`${this.apiUrl}/Specialists`);
  }

  
}
