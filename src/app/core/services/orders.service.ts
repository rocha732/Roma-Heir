import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Orders, CreateOrderRequest } from '../models/orders';

@Injectable({
  providedIn: 'root'
})
export class OrdersService {
 private apiUrl =
    'https://api-roma-mahair-dev-cqgmfch0fgf9fyev.canadacentral-01.azurewebsites.net/api';
  constructor(private http: HttpClient) {}

  getOrders(): Observable<Orders[]> {
    return this.http.get<Orders[]>(`${this.apiUrl}/Orders`);
  }
  
  getOrderDetails(orderId: number): Observable<Orders> {
    return this.http.get<Orders>(`${this.apiUrl}/Orders/${orderId}/details`);
  }

  updatePayment(orderId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/Orders/${orderId}/pays`, {});
  }

  createOrder(order: CreateOrderRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/Orders`, order);
  }
}
