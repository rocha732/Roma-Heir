import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { GetSpecialists } from 'src/app/core/models/specialists';
import { SpecialistsService } from 'src/app/core/services/specialists.service';
import { ProductsService } from 'src/app/core/services/products.service';
import { SalonServicesService } from 'src/app/core/services/salon-services.service';

@Component({
  selector: 'app-service-stylists',
  templateUrl: './service-stylists.component.html',
  styleUrls: ['./service-stylists.component.scss'],
})
export class ServiceStylistsComponent implements OnInit {
  specialists: GetSpecialists[] = [];
  loadingList = false;
  errorMsg: string | null = null;

  searchFirstName = '';
  searchLastName = '';
  searchEmail = '';
  filterCountry = '';
  filterRole = '';

  constructor(
    private specialistsService: SpecialistsService,
    private productsService: ProductsService,
    private salonServices: SalonServicesService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadSpecialists();
  }

  loadSpecialists() {
  this.errorMsg = null;
  this.loadingList = true;
  this.specialists = [];

  this.specialistsService
    .getSpecialists()
    .subscribe({
      next: (rows) => {
        const specialists = Array.isArray(rows)
          ? rows
          : [];
        this.productsService
          .getProducts()
          .pipe(finalize(() => (this.loadingList = false)))
          .subscribe({
            next: (products: any[]) => {

  const services = products.filter((p) => {

    const typeName =
      p?.productType?.name ||
      p?.ProductType?.name ||
      p?.productTypeName ||
      p?.ProductType;

    return (
      typeof typeName === 'string' &&
      typeName.toLowerCase().includes('service')
    );
  });

  specialists.forEach((specialist: any) => {
    specialist.services = [];
  });

  services.forEach((service: any) => {

    this.salonServices
      .getServiceStylists(service.id)
      .subscribe({
        next: (response: any) => {
          const stylists = Array.isArray(response?.stylists)
            ? response.stylists
            : [];
          stylists.forEach((stylist: any) => {
            const specialistFound = specialists.find(
              (s: any) => s.id === stylist.id
            );
            if (specialistFound) {
              specialistFound.services ??= [];
              specialistFound.services.push({
                id: service.id,
                name: service.name
              });
            }
          });
          this.specialists = [...specialists];
        }
      });
    });
  },
            error: (err) => {
              console.error(err);
              this.loadingList = false;
              this.errorMsg =
                'No se pudieron cargar los servicios.';
            }
          });
      },
      error: (err) => {
        this.loadingList = false;
        console.error(err);
        this.specialists = [];
        this.errorMsg =
          err?.error?.detail ||
          err?.error?.title ||
          'No se pudieron obtener los especialistas.';
      },
    });
}

  get filteredSpecialists(): GetSpecialists[] {
    return this.specialists.filter((specialist) => {
      const name = `${specialist.firstName ?? ''}`.toLowerCase();
      const lastName = `${specialist.lastName ?? ''}`.toLowerCase();
      const email = `${specialist.email ?? ''}`.toLowerCase();
      const country = `${specialist.country?.name ?? specialist.country?.code ?? specialist.countryId ?? ''}`.toLowerCase();
      const role = `${specialist.role?.name ?? ''}`.toLowerCase();

      return (
        (!this.searchFirstName || name.includes(this.searchFirstName.toLowerCase())) &&
        (!this.searchLastName || lastName.includes(this.searchLastName.toLowerCase())) &&
        (!this.searchEmail || email.includes(this.searchEmail.toLowerCase())) &&
        (!this.filterCountry || country === this.filterCountry.toLowerCase()) &&
        (!this.filterRole || role === this.filterRole.toLowerCase())
      );
    });
  }

  get countryOptions(): string[] {
    const countries = new Set<string>();
    this.specialists.forEach((specialist) => {
      const country = specialist.country?.name ?? specialist.country?.code ?? specialist.countryId;
      if (country) countries.add(country);
    });
    return Array.from(countries).sort();
  }

  get roleOptions(): string[] {
    const roles = new Set<string>();
    this.specialists.forEach((specialist) => {
      const roleName = specialist.role?.name;
      if (roleName) roles.add(roleName);
    });
    return Array.from(roles).sort();
  }

  manageSpecialist(specialist: GetSpecialists) {
    this.router.navigate(['/home', 'services', 'stylists', specialist.id, 'edit'], {
      state: { specialist },
    });
  }

  specialistFullName(row: GetSpecialists): string {
    return `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() || `Especialista #${row.id}`;
  }

  specialistLocation(row: GetSpecialists): string {
    return (
      row.country?.name ||
      row.country?.code ||
      row.countryId ||
      '—'
    );
  }

  specialistAvatarInitials(row: GetSpecialists): string {
    const first = row.firstName?.trim().charAt(0) ?? '';
    const last = row.lastName?.trim().charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || '#';
  }
}
