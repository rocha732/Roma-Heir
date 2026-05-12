import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { GetSpecialists } from 'src/app/core/models/specialists';
import { ProductsService } from 'src/app/core/services/products.service';
import { SalonServicesService } from 'src/app/core/services/salon-services.service';
import { SpecialistsService } from 'src/app/core/services/specialists.service';
import { ProcessingOverlayService } from 'src/app/core/services/processing-overlay.service';

@Component({
  selector: 'app-service-stylist-assignment',
  templateUrl: './service-stylist-assignment.component.html',
  styleUrls: ['./service-stylist-assignment.component.scss'],
})
export class ServiceStylistAssignmentComponent implements OnInit {
  services: any[] = [];
  allSpecialists: GetSpecialists[] = [];
  selectedServiceId: number | null = null;
  selectedService: any = null;
  linkedStylists: GetSpecialists[] = [];

  loadingServices = false;
  loadingSpecialists = false;
  loadingLinked = false;
  savingAssignment = false;

  errorMsg: string | null = null;
  successMsg: string | null = null;

  selectedStylistId: number | null = null;

  constructor(
    private productsService: ProductsService,
    private salonServices: SalonServicesService,
    private specialistsService: SpecialistsService,
    private processingOverlay: ProcessingOverlayService
  ) {}

  ngOnInit() {
    this.loadServices();
    this.loadAllSpecialists();
  }

  loadServices() {
    this.loadingServices = true;
    this.errorMsg = null;

    this.productsService
      .getProducts()
      .pipe(finalize(() => (this.loadingServices = false)))
      .subscribe({
        next: (items: any[]) => {
          const list = Array.isArray(items) ? items : [];

          this.services = list.filter((item) => {
            const typeName =
              item?.productType?.name ||
              item?.ProductType?.name ||
              item?.productTypeName ||
              item?.ProductType;

            return (
              typeof typeName === 'string' &&
              typeName.toLowerCase().includes('service')
            );
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

  loadAllSpecialists() {
    this.loadingSpecialists = true;

    this.specialistsService
      .getSpecialists()
      .pipe(finalize(() => (this.loadingSpecialists = false)))
      .subscribe({
        next: (rows) => {
          this.allSpecialists = Array.isArray(rows) ? rows : [];
        },
        error: (err) => {
          console.error(err);
          this.allSpecialists = [];
        },
      });
  }

  onServiceChange() {
    this.linkedStylists = [];
    this.selectedStylistId = null;
    this.successMsg = null;

    this.selectedService = this.services.find(
        (s) => s.id === this.selectedServiceId
    );

    if (this.selectedServiceId) {
      this.loadLinkedStylists();
    }
  }

  loadLinkedStylists() {
    if (!this.selectedServiceId) return;

    this.loadingLinked = true;
    this.errorMsg = null;

    this.salonServices
      .getServiceStylists(this.selectedServiceId)
      .pipe(finalize(() => (this.loadingLinked = false)))
      .subscribe({
        next: (response: any) => {
          console.log('SERVICE RESPONSE', response);

          this.linkedStylists = Array.isArray(response?.stylists)
            ? response.stylists
            : [];
        },
        error: (err) => {
          console.error(err);

          this.linkedStylists = [];

          this.errorMsg =
            err?.error?.detail ||
            err?.error?.title ||
            'No se pudieron obtener los estilistas del servicio.';
        },
      });
  }

  get availableSpecialists(): GetSpecialists[] {
    const linkedIds = new Set(this.linkedStylists.map((s) => s.id));

    return this.allSpecialists.filter(
      (s) => !linkedIds.has(s.id)
    );
  }

  assignStylist() {
    if (!this.selectedServiceId || !this.selectedStylistId) {
      this.errorMsg = 'Selecciona un servicio y un especialista.';
      return;
    }

    this.errorMsg = null;
    this.successMsg = null;
    this.savingAssignment = true;

    this.processingOverlay.show(
      'Asignando especialista al servicio...'
    );

    this.salonServices
      .assignStylist(
        this.selectedServiceId,
        this.selectedStylistId
      )
      .pipe(finalize(() => (this.savingAssignment = false)))
      .subscribe({
        next: () => {
          this.processingOverlay.hide();

          this.successMsg =
            'Especialista asignado correctamente.';

          this.selectedStylistId = null;

          this.loadLinkedStylists();
        },
        error: (err) => {
          this.processingOverlay.hide();

          console.error(err);

          this.errorMsg =
            err?.error?.detail ||
            err?.error?.title ||
            'No se pudo asignar el especialista.';
        },
      });
  }

  unassignStylist(stylistId: number) {
    if (
      !this.selectedServiceId ||
      !confirm(
        '¿Quitar este especialista del servicio?'
      )
    )
      return;

    this.errorMsg = null;
    this.successMsg = null;
    this.savingAssignment = true;

    this.processingOverlay.show(
      'Removiendo especialista del servicio...'
    );

    this.salonServices
      .removeStylist(
        this.selectedServiceId,
        stylistId
      )
      .pipe(finalize(() => (this.savingAssignment = false)))
      .subscribe({
        next: () => {
          this.processingOverlay.hide();

          this.successMsg =
            'Especialista removido del servicio.';

          this.loadLinkedStylists();
        },
        error: (err) => {
          this.processingOverlay.hide();

          console.error(err);

          this.errorMsg =
            err?.error?.detail ||
            err?.error?.title ||
            'No se pudo remover el especialista.';
        },
      });
  }

  specialistFullName(
    specialist: GetSpecialists
  ): string {
    return (
      `${specialist.firstName ?? ''} ${
        specialist.lastName ?? ''
      }`.trim() ||
      `Especialista #${specialist.id}`
    );
  }
}