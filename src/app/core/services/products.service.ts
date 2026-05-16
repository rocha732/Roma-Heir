import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private apiUrl = 'https://api-roma-mahair-dev-cqgmfch0fgf9fyev.canadacentral-01.azurewebsites.net/api';

  constructor(private http: HttpClient) {}

  getProducts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/Products`);
  }

  addProduct(product: any) {
    const formData = new FormData();
    if (product.Name !== undefined && product.Name !== null) {
      formData.append('Name', String(product.Name));
    }
    if (product.Description !== undefined && product.Description !== null) {
      formData.append('Description', String(product.Description));
    }
    if (product.Price !== undefined && product.Price !== null && product.Price > 0) {
      formData.append('Price', String(product.Price));
    }
    formData.append('Available', product.Available !== undefined && product.Available !== null ? (product.Available ? 'true' : 'false') : 'false');
    if (product.CategoryId !== undefined && product.CategoryId !== null) {
      formData.append('CategoryId', String(product.CategoryId));
    }
    if (product.ProductType !== undefined && product.ProductType !== null) {
      formData.append('ProductType', String(product.ProductType));
    }
    if (product.Picture) {
      formData.append('Picture', product.Picture);
    }
    return this.http.post(`${this.apiUrl}/Products`, formData);
  }

  updateProduct(id: number, product: any) {
    const formData = new FormData();
    if (product.Name !== undefined && product.Name !== null) {
      formData.append('Name', String(product.Name));
    }
    if (product.Description !== undefined && product.Description !== null) {
      formData.append('Description', String(product.Description));
    }
    if (product.Price !== undefined && product.Price !== null && product.Price > 0) {
      formData.append('Price', String(product.Price));
    }
    formData.append('Available', product.Available !== undefined && product.Available !== null ? (product.Available ? 'true' : 'false') : 'false');
    if (product.CategoryId !== undefined && product.CategoryId !== null) {
      formData.append('CategoryId', String(product.CategoryId));
    }
    if (product.ProductType !== undefined && product.ProductType !== null) {
      formData.append('ProductType', String(product.ProductType));
    }
    if (product.Picture) {
      formData.append('Picture', product.Picture);
    }
    return this.http.put(`${this.apiUrl}/Products/${id}`, formData);
  }
}
