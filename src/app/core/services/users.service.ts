import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  RequestAccount,
  RequestVerifyAccount,
  ResponseUsers,
} from '../models/users';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private apiUrl =
    'https://api-roma-mahair-dev-cqgmfch0fgf9fyev.canadacentral-01.azurewebsites.net/api';
  constructor(private http: HttpClient) {}

  postRegisterUser(user: RequestAccount): Observable<any> {
    const url = `${this.apiUrl}/Account/register`;
    return this.http.post(url, user);
  }

  postVerifyAccount(user: RequestVerifyAccount): Observable<any> {
    const url = `${this.apiUrl}/Account/verify`;
    return this.http.post(url, user);
  }

  postResendCode(user: RequestAccount): Observable<any> {
    const url = `${this.apiUrl}/Account/resend-code`;
    return this.http.post(url, user);
  }
  getUsers(filters?: {
    email?: string;
    name?: string;
    lastName?: string;
    roleId?: number;
  }): Observable<ResponseUsers[]> {
    let params = new HttpParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value);
        }
      });
    }

    return this.http.get<ResponseUsers[]>(`${this.apiUrl}/Users`, { params });
  }
  getUserById(id: number): Observable<ResponseUsers> {
    const url = `${this.apiUrl}/Users/${id}`;
    return this.http.get<ResponseUsers>(url);
  }
  putUpdateUser(formData: FormData, id: number): Observable<any> {
    const url = `${this.apiUrl}/Users/${id}`;
    return this.http.put(url, formData);
  }
}
