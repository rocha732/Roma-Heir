import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RequestAccount, RequestVerifyAccount } from '../models/users';
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
}
