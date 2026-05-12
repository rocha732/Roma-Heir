import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { GetSpecialists } from 'src/app/core/models/specialists';
import { ProductsService } from 'src/app/core/services/products.service';
import { SpecialistsService } from 'src/app/core/services/specialists.service';

@Component({
  selector: 'app-service-stylists-edit',
  templateUrl: './service-stylists-edit.component.html',
  styleUrls: ['./service-stylists-edit.component.scss'],
})
export class ServiceStylistsEditComponent implements OnInit {
  specialist: GetSpecialists | null = null;
  services: any[] = [];
  selectedServiceIds: number[] = [];
  loading = false;
  saving = false;
  errorMsg: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private specialistsService: SpecialistsService,
    private productsService: ProductsService
  ) {}

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (!id || Number.isNaN(id)) {
      this.errorMsg = 'ID de especialista inválido.';
      return;
    }

    this.loadServices();
    this.loadSpecialist(id);
  }

  loadSpecialist(id: number) {
    this.loading = true;
    this.errorMsg = null;

    this.specialistsService.getSpecialistById(id).pipe(finalize(() => (this.loading = false))).subscribe({
      next: (specialist) => {
        this.specialist = specialist;
        if (!this.specialist.role) {
          this.specialist.role = { id: 0, name: '' } as any;
        }
        this.selectedServiceIds = Array.isArray((specialist as any).serviceIds)
          ? [...(specialist as any).serviceIds]
          : [];
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = err?.error?.detail || err?.error?.title || 'No se pudo cargar el especialista.';
      },
    });
  }

  loadServices() {
    this.productsService.getProducts().subscribe({
      next: (items: any[]) => {
        const list = Array.isArray(items) ? items : [];
        this.services = list.filter((item) => {
          const typeName =
            item?.productType?.name || item?.ProductType?.name || item?.productTypeName || item?.ProductType;
          return typeof typeName === 'string' && typeName.toLowerCase().includes('service');
        });
      },
      error: (err) => {
        console.error(err);
        this.services = [];
      },
    });
  }

  specialistFullName(): string {
    if (!this.specialist) return 'Especialista';
    return `${this.specialist.firstName ?? ''} ${this.specialist.lastName ?? ''}`.trim() || `Especialista #${this.specialist.id}`;
  }

  saveSpecialist() {
    if (!this.specialist) return;
    this.errorMsg = null;
    this.saving = true;

    const payload: any = {
      firstName: this.specialist.firstName,
      lastName: this.specialist.lastName,
      email: this.specialist.email,
      phone: this.specialist.phone,
      role: this.specialist.role,
      serviceIds: this.selectedServiceIds,
    };

    this.specialistsService
      .updateSpecialist(this.specialist.id, payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.router.navigate(['/home/services/stylists']);
        },
        error: (err) => {
          console.error(err);
          this.errorMsg = err?.error?.detail || err?.error?.title || 'No se pudo guardar el especialista.';
        },
      });
  }

  cancel() {
    this.router.navigate(['/home/services/stylists']);
  }
}
