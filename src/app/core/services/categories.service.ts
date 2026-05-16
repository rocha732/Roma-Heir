import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private apiUrl = 'https://api-roma-mahair-dev-cqgmfch0fgf9fyev.canadacentral-01.azurewebsites.net/api';

  constructor(private http: HttpClient) {}

  getCategories(): Observable<{ id: number, name: string }[]> {
    return this.http.get<{ id: number, name: string }[]>(`${this.apiUrl}/Categories`);
  }
}
