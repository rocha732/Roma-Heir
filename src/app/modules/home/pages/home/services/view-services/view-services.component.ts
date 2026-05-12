import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ProductsService } from 'src/app/core/services/products.service';

@Component({
  selector: 'app-view-services',
  templateUrl: './view-services.component.html',
  styleUrls: ['./view-services.component.scss'],
})
export class ViewServicesComponent implements OnInit {
  services: any[] = [];
  /** Placeholder rows para el skeleton del listado */
  skeletonRows = [0, 1, 2, 3, 4];
  loading = true;
  errorMsg: string | null = null;

  get totalServices(): number {
    return this.services.length;
  }

  get availableServices(): number {
    return this.services.filter(s => s.available).length;
  }

  get unavailableServices(): number {
    return this.services.filter(s => !s.available).length;
  }

  get averagePrice(): number {
    if (this.services.length === 0) return 0;
    return this.services.reduce((sum, s) => sum + (s.price || 0), 0) / this.services.length;
  }

  constructor(
    private productsService: ProductsService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadServices();
  }

  loadServices() {
    this.errorMsg = null;
    this.loading = true;

    this.productsService.getProducts()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (items: any[]) => {
          const list = Array.isArray(items) ? items : [];
          this.services = list.filter((item) => {
            const typeName = item?.productType?.name || item?.ProductType?.name || item?.productTypeName || item?.ProductType;
            return typeof typeName === 'string' && typeName.toLowerCase().includes('service');
          });
        },
        error: (err) => {
          console.error(err);
          this.services = [];
          this.errorMsg =
            err?.error?.detail ||
            err?.error?.title ||
            'No se pudieron cargar los servicios.';
        },
      });
  }

  manageStylistsById(id: number) {
    const service = this.services.find((s: any) => s.id === id);
    if (!service) return;
    this.router.navigate(['/home', 'services', service.id, 'stylists'], {
      state: { svc: { id: service.id, name: service.name } },
    });
  }

  trimDescription(d?: string, max = 90): string {
    if (!d) return '';
    const t = d.trim();
    if (t.length <= max) return t;
    return t.slice(0, max).trimEnd() + '…';
  }
}
