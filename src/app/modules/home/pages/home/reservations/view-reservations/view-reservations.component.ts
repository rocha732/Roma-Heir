import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GetReservations } from 'src/app/core/models/reservations';
import { ReservationStatusesService } from 'src/app/core/services/reservation-statuses.service';
import { ReservationsService } from 'src/app/core/services/reservations.service';
import { ProductsService } from 'src/app/core/services/products.service';
import { SalonServicesService } from 'src/app/core/services/salon-services.service';
import * as XLSX from 'xlsx';
import flatpickr from 'flatpickr';
import { Spanish } from 'flatpickr/dist/l10n/es';
import { Instance as FlatpickrInstance } from 'flatpickr/dist/types/instance';
import { UsersService } from 'src/app/core/services/users.service';
import { ResponseUsers } from 'src/app/core/models/users';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NotificationModalComponent } from 'src/app/components/notification-modal/notification-modal.component';

@Component({
  selector: 'app-view-reserve',
  templateUrl: './view-reservations.component.html',
  styleUrls: ['./view-reservations.component.scss'],
})
export class ViewReservationsComponent implements AfterViewInit {
  @ViewChild('dateRangeInput') dateRangeInput!: ElementRef;

  loading = true;
  private usersLoaded = false;
  private reservationsLoaded = false;
  private serviceContextLoaded = false;

  reservations: GetReservations[] = [];
  allReservations: GetReservations[] = [];
  rawReservations: GetReservations[] = [];
  users: ResponseUsers[] = [];
  monthKeys: string[] = [];
  searchTerm = '';
  monthlyChart!: Chart;
  page = 1;
  pageSize = 8;
  startDate?: Date;
  endDate?: Date;
  flatpickrInstance!: FlatpickrInstance;
  pieChart!: Chart<'pie', number[], string>;
  specialistsMap = new Map<number, string>();
  usersMap = new Map<number, any>();
  serviceNamesMap = new Map<number, string>();
  servicePriceMap = new Map<number, number>();
  specialistServiceIdsMap = new Map<number, number[]>();
  reservationServiceCacheById = new Map<number, number>();
  reservationServiceCacheByFingerprint = new Map<string, number>();
  private readonly reservationServiceCacheKey =
    'calendarReservationServiceCacheV1';
  statues = [
    {
      id: 1,
      name: 'Pendiente',
    },
    {
      id: 2,
      name: 'Confirmada',
    },
    {
      id: 3,
      name: 'Cancelada',
    },
    {
      id: 4,
      name: 'Completada',
    },
    {
      id: 5,
      name: 'Ausente',
    },
    {
      id: 6,
      name: 'Reprogramada',
    },
  ];

  showReprogramModal = false;

  reprogramData = {
    reservationId: null as number | null,
    date: '',
    hour: '',
    id: '',
  };

  availableHours: string[] = [];
  todayString = new Date().toISOString().split('T')[0];

  constructor(
    private reservationsService: ReservationsService,
    private reservationStatusesService: ReservationStatusesService,
    private usersService: UsersService,
    private salonServicesService: SalonServicesService,
    private productsService: ProductsService,
    private modalService: NgbModal
  ) {}

  ngOnInit() {
    this.loading = true;
    this.loadReservationServiceCache();
    this.loadSpecialists();
    this.loadServiceContext();
    this.loadUsers();
    this.loadReservations();
  }

  private tryMapReservations() {
    if (
      this.usersLoaded &&
      this.reservationsLoaded &&
      this.serviceContextLoaded
    ) {
      this.mapReservations();
    }
  }

  loadReservations() {
    this.reservationsService.getReservations().subscribe({
      next: (res) => {
        this.rawReservations = res;
        this.reservationsLoaded = true;
        this.tryMapReservations();
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private loadServiceContext() {
    forkJoin({
      services: this.salonServicesService
        .getServices()
        .pipe(catchError(() => of([]))),
      products: this.productsService
        .getProducts()
        .pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ services, products }) => {
        this.buildServiceLookup(services as any[], products as any[]);

        const serviceIds = Array.from(this.serviceNamesMap.keys()).filter(
          (id) => id > 0
        );

        if (serviceIds.length === 0) {
          this.serviceContextLoaded = true;
          this.tryMapReservations();
          return;
        }

        const requests = serviceIds.map((serviceId) =>
          this.salonServicesService
            .getServiceStylists(serviceId)
            .pipe(catchError(() => of([])))
        );

        forkJoin(requests).subscribe({
          next: (responses) => {
            const specialistMap = new Map<number, number[]>();

            responses.forEach((response, index) => {
              const serviceId = serviceIds[index];
              const stylists = this.normalizeStylistsResponse(response);

              stylists.forEach((stylist: any) => {
                const specialistId = Number(stylist?.id);
                if (!Number.isFinite(specialistId) || specialistId <= 0) {
                  return;
                }

                const current = specialistMap.get(specialistId) || [];
                if (!current.includes(serviceId)) {
                  current.push(serviceId);
                }
                specialistMap.set(specialistId, current);
              });
            });

            this.specialistServiceIdsMap = specialistMap;
            this.serviceContextLoaded = true;
            this.tryMapReservations();
          },
          error: () => {
            this.serviceContextLoaded = true;
            this.tryMapReservations();
          },
        });
      },
      error: () => {
        this.serviceContextLoaded = true;
        this.tryMapReservations();
      },
    });
  }

  private buildServiceLookup(services: any[], products: any[]) {
    this.serviceNamesMap = new Map<number, string>();
    this.servicePriceMap = new Map<number, number>();

    products.forEach((product: any) => {
      const typeName = String(
        product?.productType?.name ||
          product?.ProductType?.name ||
          product?.productTypeName ||
          product?.ProductType ||
          ''
      ).toLowerCase();

      if (!typeName.includes('service')) {
        return;
      }

      const id = Number(product?.id);
      const name = String(product?.name || product?.Name || '').trim();
      const price = Number(product?.price ?? product?.Price ?? 0);

      if (Number.isFinite(id) && id > 0) {
        if (name) {
          this.serviceNamesMap.set(id, name);
        }

        if (Number.isFinite(price)) {
          this.servicePriceMap.set(id, price);
        }
      }
    });

    services.forEach((service: any) => {
      const id = Number(service?.id);
      const name = String(service?.name || service?.Name || '').trim();

      if (Number.isFinite(id) && id > 0 && name) {
        this.serviceNamesMap.set(id, name);
      }
    });
  }

  private normalizeStylistsResponse(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.stylists)) {
      return response.stylists;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    return [];
  }
  ngAfterViewInit() {
    this.flatpickrInstance = flatpickr(this.dateRangeInput.nativeElement, {
      mode: 'range',
      dateFormat: 'Y-m-d',
      locale: Spanish,
      appendTo: document.body,
      onChange: (selectedDates) => {
        this.startDate = selectedDates[0];
        this.endDate = selectedDates[1];
      },
    });
  }

  getStatusLabel(status: number) {
    switch (status) {
      case 1:
        return 'Pendiente';
      case 2:
        return 'Confirmada';
      case 3:
        return 'Cancelada';
      case 4:
        return 'Completada';
      case 5:
        return 'Ausente';
      case 6:
        return 'Reprogramada';
      default:
        return 'Desconocido';
    }
  }

  // 📊 GRAFICO MENSUAL (SIN CANCELADOS)
  createMonthlyChart() {
    if (this.monthlyChart) this.monthlyChart.destroy();

    const map = new Map<string, number>();

    this.filteredReservations
      .filter((r) => r.statusId !== 3)
      .forEach((r) => {
        const date = new Date(r.reservedAt);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        map.set(key, (map.get(key) || 0) + 1);
      });

    const sortedKeys = Array.from(map.keys()).sort((a, b) => {
      const [y1, m1] = a.split('-').map(Number);
      const [y2, m2] = b.split('-').map(Number);
      return new Date(y1, m1).getTime() - new Date(y2, m2).getTime();
    });
    this.monthKeys = sortedKeys; // ⬅️ guarda: ['2025-9', '2025-10', ...]

    const labels = sortedKeys.map((k) => {
      const [y, m] = k.split('-').map(Number);
      return this.getMonthLabel(new Date(y, m));
    });

    const values = sortedKeys.map((k) => map.get(k)!);

    this.monthlyChart = new Chart('monthlyChart', {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Citas registradas', data: values }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,

        onClick: (_, elements) => {
          if (!elements.length) return;

          const index = elements[0].index;
          const label = labels[index]; // Ej: "Oct 2025"

          this.applyMonthFilter(index);
        },
      },
    });
  }

  // 🥧 PIE CANCELADAS VS NO CANCELADAS
  createPieChart() {
    if (this.pieChart) this.pieChart.destroy();

    const canceled = this.filteredReservations.filter(
      (r) => r.statusId === 3
    ).length;
    const active = this.filteredReservations.filter(
      (r) => r.statusId !== 3
    ).length;

    this.pieChart = new Chart<'pie', number[], string>('statusPieChart', {
      type: 'pie',
      data: {
        labels: ['Canceladas', 'No canceladas'],
        datasets: [
          {
            data: [canceled, active],
            backgroundColor: [
              'rgba(239, 68, 68, 0.8)', // Canceladas (rojo)
              'rgba(16, 185, 129, 0.8)', // No canceladas (verde)
            ],
            // Borde oscuro entre porciones (igual al pie de Users)
            borderColor: 'rgba(18, 19, 26, 0.8)',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: 'rgba(255, 255, 255, 0.8)',
              padding: 15,
              font: { size: 12 },
            },
          },
        },

        onClick: (_, elements) => {
          if (!elements.length) return;

          const index = elements[0].index;
          index === 0
            ? this.applyStatusFilter(3)
            : this.applyStatusFilterNot(3);
        },
      },
    });
  }

  totalReservations() {
    return this.filteredReservations.length;
  }

  activeReservations() {
    return this.filteredReservations.filter((r) => r.statusId !== 3).length;
  }

  canceledReservations() {
    return this.filteredReservations.filter((r) => r.statusId === 3).length;
  }
  getMonthLabel(date: Date): string {
    return date.toLocaleString('es-PE', { month: 'short', year: 'numeric' });
  }
  exportToExcel() {
    const data = this.filteredReservations.map((r) => ({
      ID: r.id,
      Cliente: r.customerName,
      Email: r.customerEmail,
      Teléfono: r.customerPhone,
      Especialista: r.specialistName,
      Servicio: (r as any).resolvedServiceName ?? 'Sin servicio',
      Precio: Number((r as any).resolvedServicePrice ?? 0).toFixed(2),
      Fecha: r.reservedAt,
      Hora: r.hourAt,
      Estado: this.getStatusLabel(r.statusId),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reservas');

    XLSX.writeFile(wb, 'reservas.xlsx');
  }

  get filteredReservations() {
    return this.reservations.filter((r) => {
      const date = new Date(r.reservedAt).getTime();
      const start = this.startDate?.getTime();
      const end = this.endDate?.getTime();

      const matchDate = (!start || date >= start) && (!end || date <= end);

      const matchText = JSON.stringify(r)
        .toLowerCase()
        .includes(this.searchTerm.toLowerCase());

      return matchDate && matchText;
    });
  }

  applyMonthFilter(index: number) {
    const [year, month] = this.monthKeys[index].split('-').map(Number);

    this.reservations = this.allReservations.filter((r) => {
      const d = new Date(r.reservedAt);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }

  resetFilters() {
    // Reset data
    this.reservations = [...this.allReservations];

    // Reset texto
    this.searchTerm = '';

    // Reset fechas
    this.startDate = undefined;
    this.endDate = undefined;

    // 🔥 LIMPIA CALENDARIO
    this.flatpickrInstance.clear();
  }

  applyStatusFilter(statusId: number) {
    this.reservations = this.allReservations.filter(
      (r) => r.statusId === statusId
    );
  }

  applyStatusFilterNot(statusId: number) {
    this.reservations = this.allReservations.filter(
      (r) => r.statusId !== statusId
    );
  }
  get paginatedReservations() {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredReservations.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.ceil(this.filteredReservations.length / this.pageSize);
  }

  get totalPagesArray() {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  changePage(p: number) {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
  }

  loadSpecialists() {
    const raw = localStorage.getItem('specialists');
    if (!raw) return;

    const specialists = JSON.parse(raw);

    specialists.forEach((s: any) => {
      const fullName = `${s.firstName} ${s.lastName}`;
      this.specialistsMap.set(s.id, fullName);
    });
  }
  getSpecialistName(id: number): string {
    return this.specialistsMap.get(id) || `ID ${id}`;
  }

  getResolvedServiceName(reservation: GetReservations): string {
    return (
      (reservation as any).resolvedServiceName ||
      'Sin servicio'
    );
  }

  loadUsers() {
    this.usersService.getUsers().subscribe((users) => {
      users.forEach((u) => {
        this.usersMap.set(u.id, {
          name: `${u.firstName} ${u.lastName}`,
          email: u.email,
          phone: u.phone,
        });
      });

      this.usersLoaded = true;
      this.tryMapReservations();
    });
  }

  private resolveServiceId(source: any): number | null {
    const directId = Number(
      source?.serviceId ??
        source?.ServiceId ??
        source?.productId ??
        source?.ProductId ??
        source?.service?.id ??
        source?.product?.id ??
        0
    );

    if (Number.isFinite(directId) && directId > 0) {
      return directId;
    }

    const byCache = this.resolveServiceIdFromCache(source);
    if (byCache !== null) {
      return byCache;
    }

    const specialistId = Number(source?.specialistId ?? 0);
    const servicesByStylist =
      this.specialistServiceIdsMap.get(specialistId) || [];

    if (servicesByStylist.length === 1) {
      return servicesByStylist[0];
    }

    return null;
  }

  private resolveServiceIdFromCache(source: any): number | null {
    const reservationId = Number(source?.id ?? 0);

    if (
      Number.isFinite(reservationId) &&
      reservationId > 0 &&
      this.reservationServiceCacheById.has(reservationId)
    ) {
      return this.reservationServiceCacheById.get(reservationId) || null;
    }

    const fingerprint = this.buildReservationFingerprint(source);

    if (
      fingerprint &&
      this.reservationServiceCacheByFingerprint.has(fingerprint)
    ) {
      return (
        this.reservationServiceCacheByFingerprint.get(fingerprint) || null
      );
    }

    return null;
  }

  private resolveServiceName(
    source: any,
    serviceId: number | null
  ): string {
    const directName = String(
      source?.service?.name ||
        source?.service?.Name ||
        source?.serviceName ||
        source?.productName ||
        ''
    ).trim();

    if (
      directName &&
      directName.toLowerCase() !== 'sin servicio'
    ) {
      return directName;
    }

    if (serviceId && this.serviceNamesMap.has(serviceId)) {
      return this.serviceNamesMap.get(serviceId) || 'Sin servicio';
    }

    return 'Sin servicio';
  }

  private resolveServicePrice(
    source: any,
    serviceId: number | null
  ): number {
    const direct = Number(source?.service?.price ?? 0);

    if (Number.isFinite(direct) && direct > 0) {
      return direct;
    }

    if (serviceId && this.servicePriceMap.has(serviceId)) {
      return this.servicePriceMap.get(serviceId) || 0;
    }

    return 0;
  }

  private buildReservationFingerprint(source: any): string {
    const customerId = Number(source?.customerId ?? 0);
    const specialistId = Number(source?.specialistId ?? 0);
    const reservedAt = String(source?.reservedAt || '').trim();
    const hourAt = String(source?.hourAt || '').trim();

    if (
      !Number.isFinite(customerId) ||
      customerId <= 0 ||
      !Number.isFinite(specialistId) ||
      specialistId <= 0 ||
      !reservedAt ||
      !hourAt
    ) {
      return '';
    }

    return `${customerId}|${specialistId}|${reservedAt}|${hourAt}`;
  }

  private loadReservationServiceCache() {
    try {
      const raw = localStorage.getItem(this.reservationServiceCacheKey);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      const byIdEntries = Array.isArray(parsed?.byId)
        ? parsed.byId
        : [];
      const byFingerprintEntries = Array.isArray(parsed?.byFingerprint)
        ? parsed.byFingerprint
        : [];

      this.reservationServiceCacheById = new Map(byIdEntries);
      this.reservationServiceCacheByFingerprint = new Map(
        byFingerprintEntries
      );
    } catch (error) {
      console.error('[ViewReservations] error leyendo cache de servicio', error);
    }
  }

  mapReservations() {
    this.reservations = this.rawReservations.map((r) => {
      const user = this.usersMap.get(r.customerId);
      const specialist = this.specialistsMap.get(r.specialistId);
      const resolvedServiceId = this.resolveServiceId(r);
      const resolvedServiceName = this.resolveServiceName(
        r,
        resolvedServiceId
      );
      const resolvedServicePrice = this.resolveServicePrice(
        r,
        resolvedServiceId
      );

      return {
        ...r,
        customerName: user?.name ?? '—',
        customerEmail: user?.email ?? '—',
        customerPhone: user?.phone ?? '—',
        specialistName: specialist ?? '—',
        resolvedServiceId,
        resolvedServiceName,
        resolvedServicePrice,
      };
    });

    this.allReservations = [...this.reservations];
    this.page = 1;

    // Renderiza la UI primero y luego inicializa charts (si no, el canvas no existe cuando hay loading)
    this.loading = false;
    setTimeout(() => {
      this.createMonthlyChart();
      this.createPieChart();
    }, 0);
  }
  isTodayOrFuture(reservedAt: string | Date): boolean {
    let date: Date;

    if (typeof reservedAt === 'string') {
      // yyyy-mm-dd → fecha local
      const [year, month, day] = reservedAt.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(reservedAt);
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    return date >= today;
  }

  onChangeStatus(reservation: any, newStatusId: number) {
    if (reservation.statusId === newStatusId) return;

    this.reservationsService
      .updateReservationStatus(reservation.id, { newStatusId })
      .subscribe({
        next: () => {
          reservation.statusId = newStatusId;
          this.loadReservations();
        },
        error: (err) => {
          this.openErrorModal(err, 'No se pudo cambiar el estado de la reservación.');
        },
      });
  }

  onReprogram(reservation: any) {
    this.reprogramData = {
      reservationId: reservation.id,
      id: reservation.id,
      date: this.todayString,
      hour: '',
    };

    this.generateHours();
    this.showReprogramModal = true;
  }

  generateHours() {
    const hours: string[] = [];
    const now = new Date();

    for (let h = 9; h <= 20; h++) {
      for (let m of [0, 30]) {
        if (h === 20 && m > 0) continue;

        const hh = h.toString().padStart(2, '0');
        const mm = m.toString().padStart(2, '0');
        const time = `${hh}:${mm}`;

        // ⏱ Si es hoy, solo horas futuras
        if (this.reprogramData.date === this.todayString) {
          const compare = new Date();
          compare.setHours(h, m, 0, 0);
          if (compare <= now) continue;
        }

        hours.push(time);
      }
    }

    this.availableHours = hours;
  }

  onDateChange() {
    this.reprogramData.hour = '';
    this.generateHours();
  }

  submitReprogram() {
    const { reservationId, date, hour } = this.reprogramData;
    if (!reservationId || !date || !hour) {
      alert('Debe seleccionar fecha y hora');
      return;
    }
    this.loading = true;
    this.showReprogramModal = false;
    this.reservationsService
      .updateReservationDate(reservationId, {
        reservedAt: date,
        hourAt: hour + ':00',
      })
      .subscribe({
        next: () => {
          this.onChangeStatus(this.reprogramData, 6); // Cambia estado a Reprogramada
        },
        error: (err) => {
          this.openErrorModal(err, 'No se pudo reprogramar la reservación.');
        },
      });
  }

  private openErrorModal(err: any, defaultMsg: string) {
    const message = err?.error?.detail || err?.error?.message || err?.error?.title || defaultMsg;
    const modalRef = this.modalService.open(NotificationModalComponent, { centered: true });
    modalRef.componentInstance.title = 'Error';
    modalRef.componentInstance.message = message;
    modalRef.componentInstance.type = 'error';
  }
}
