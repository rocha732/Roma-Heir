import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { GetSpecialists } from 'src/app/core/models/specialists';
import { SalonServicesService } from 'src/app/core/services/salon-services.service';
import { SpecialistsService } from 'src/app/core/services/specialists.service';
import { SalonServiceBrief } from 'src/app/core/models/salon-service';
import { ProcessingOverlayService } from 'src/app/core/services/processing-overlay.service';

@Component({
  selector: 'app-service-stylists',
  templateUrl: './service-stylists.component.html',
  styleUrls: ['./service-stylists.component.scss'],
})
export class ServiceStylistsComponent implements OnInit {
  /** Al venir desde el listado o URL con id: servicio fijo (sin reapertura del combo). */
  lockedServiceId: number | null = null;
  lockedServiceName: string | null = null;

  services: SalonServiceBrief[] = [];
  catalogLoading = true;
  /** Si GET /Services no existe, falla o viene vacío: mostrar entrada por ID */
  catalogLoadFailed = false;
  manualServiceId: number | null = null;
  selectedServiceId: number | null = null;

  specialists: GetSpecialists[] = [];
  /** Respuesta GET estilistas del servicio (forma flexible por si el backend varía). */
  linkedRaw: unknown[] = [];
  selectedStylistToAdd: number | null = null;

  loadingList = false;
  errorMsg: string | null = null;
  okMsg: string | null = null;

  constructor(
    private salonServices: SalonServicesService,
    private specialistsService: SpecialistsService,
    private processingOverlay: ProcessingOverlayService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.initLockedServiceFromRouteOrState();

    if (this.lockedServiceId != null) {
      this.selectedServiceId = this.lockedServiceId;
      this.loadSpecialists();
      this.loadCatalog();
      this.loadLinkedStylists();
      return;
    }

    this.loadCatalog();
    this.loadSpecialists();
  }

  /** State enviado al navegar desde el listado; fallback al parámetro de ruta `serviceId`. */
  private initLockedServiceFromRouteOrState() {
    try {
      const st = (
        typeof history !== 'undefined'
          ? (history.state as { svc?: { id: number; name?: string } })
          : {}
      ).svc;
      if (st && st.id != null && Number.isFinite(Number(st.id))) {
        this.lockedServiceId = Number(st.id);
        this.lockedServiceName =
          typeof st.name === 'string' && st.name.trim().length ? st.name : null;
        return;
      }
    } catch {
      /* SSR / history no disponible */
    }

    const raw = this.route.snapshot.paramMap.get('serviceId');
    if (
      raw != null &&
      raw !== '' &&
      !Number.isNaN(Number(raw))
    ) {
      this.lockedServiceId = Number(raw);
      this.lockedServiceName = null;
    }
  }

  readonly serviceListHref = '/home/services/list';

  loadCatalog() {
    this.catalogLoading = true;
    this.salonServices
      .getServices()
      .pipe(finalize(() => (this.catalogLoading = false)))
      .subscribe({
        next: (list) => {
          this.services = Array.isArray(list) ? list : [];
          this.catalogLoadFailed = this.services.length === 0;
        },
        error: () => {
          this.services = [];
          this.catalogLoadFailed = true;
        },
      });
  }

  loadSpecialists() {
    this.specialistsService.getSpecialists().subscribe({
      next: (rows) => (this.specialists = rows ?? []),
      error: () => (this.specialists = []),
    });
  }

  get activeServiceId(): number | null {
    if (this.lockedServiceId != null) {
      return this.lockedServiceId;
    }
    if (!this.catalogLoadFailed) {
      return this.selectedServiceId;
    }
    return this.manualServiceId;
  }

  loadLinkedStylists() {
    const sid = this.activeServiceId;
    if (sid == null || Number.isNaN(Number(sid))) {
      this.errorMsg = 'Selecciona un servicio (o introduce un ID válido).';
      return;
    }
    this.errorMsg = null;
    this.okMsg = null;
    this.loadingList = true;
    this.linkedRaw = [];

    this.salonServices.getServiceStylists(Number(sid)).subscribe({
      next: (rows) => {
        this.linkedRaw = Array.isArray(rows) ? rows : [];
        this.loadingList = false;
      },
      error: (err) => {
        console.error(err);
        this.linkedRaw = [];
        this.loadingList = false;
        this.errorMsg =
          err?.error?.detail ||
          err?.error?.title ||
          'No se pudieron obtener los estilistas del servicio.';
      },
    });
  }

  stylistIdFromRow(row: unknown): number | null {
    if (!row || typeof row !== 'object') return null;
    const r = row as Record<string, unknown>;
    const v =
      r['stylistId'] ?? r['id'] ?? r['specialistId'] ?? r['StylistId'];
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  stylistLabel(row: unknown): string {
    if (!row || typeof row !== 'object')
      return 'Estilista';
    const r = row as Record<string, unknown>;
    const fn = r['firstName'] ?? r['FirstName'];
    const ln = r['lastName'] ?? r['LastName'];
    if (typeof fn === 'string' || typeof ln === 'string') {
      return `${fn ?? ''} ${ln ?? ''}`.trim() || 'Estilista';
    }
    const id = this.stylistIdFromRow(row);
    return id != null ? `Estilista #${id}` : 'Estilista';
  }

  linkedStylistIds(): number[] {
    return this.linkedRaw
      .map((row) => this.stylistIdFromRow(row))
      .filter((x): x is number => x != null);
  }

  /** Especialistas aún no vinculados al servicio */
  availableSpecialistsToAdd(): GetSpecialists[] {
    const ids = new Set(this.linkedStylistIds());
    return this.specialists.filter((s) => !ids.has(s.id));
  }

  addStylist() {
    const sid = this.activeServiceId;
    const tid = this.selectedStylistToAdd;
    if (sid == null || tid == null) {
      this.errorMsg = 'Elige servicio y estilista a agregar.';
      return;
    }
    this.errorMsg = null;
    this.okMsg = null;
    this.processingOverlay.show('Estamos creando la asociación');
    this.salonServices
      .assignStylist(Number(sid), tid)
      .pipe(finalize(() => this.processingOverlay.hide()))
      .subscribe({
        next: () => {
          this.okMsg = 'Estilista asignado correctamente.';
          this.selectedStylistToAdd = null;
          this.loadLinkedStylists();
        },
        error: (err) => {
          this.errorMsg =
            err?.error?.detail ||
            err?.error?.title ||
            'No se pudo agregar el estilista.';
        },
      });
  }

  removeStylist(stylistId: number, ev?: MouseEvent) {
    ev?.preventDefault();
    const sid = this.activeServiceId;
    if (sid == null) return;
    if (!confirm('¿Quitar este estilista del servicio?')) return;

    this.errorMsg = null;
    this.okMsg = null;
    this.processingOverlay.show('Eliminando asociación…');
    this.salonServices
      .removeStylist(Number(sid), stylistId)
      .pipe(finalize(() => this.processingOverlay.hide()))
      .subscribe({
        next: () => {
          this.okMsg = 'Estilista quitado del servicio.';
          this.loadLinkedStylists();
        },
        error: (err) => {
          this.errorMsg =
            err?.error?.detail ||
            err?.error?.title ||
            'No se pudo eliminar la asociación.';
        },
      });
  }

  onServiceSelectChange() {
    this.manualServiceId = null;
    if (this.selectedServiceId != null) this.loadLinkedStylists();
  }

  applyManualServiceId() {
    this.selectedServiceId = null;
    this.loadLinkedStylists();
  }
}
