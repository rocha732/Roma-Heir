import { Component } from '@angular/core';
import { ChartData, ChartOptions } from 'chart.js';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NotificationModalComponent } from 'src/app/components/notification-modal/notification-modal.component';
import { getReservationStatuses } from 'src/app/core/models/reservation-statuses';
import { GetReservations } from 'src/app/core/models/reservations';
import { SalonServiceBrief } from 'src/app/core/models/salon-service';
import { GetSpecialists } from 'src/app/core/models/specialists';
import {
  SalonServicesService,
  ServiceMonthlySummary,
} from 'src/app/core/services/salon-services.service';
import { ReservationStatusesService } from 'src/app/core/services/reservation-statuses.service';
import { ReservationsService } from 'src/app/core/services/reservations.service';
import { SpecialistsService } from 'src/app/core/services/specialists.service';
import { ProductsService } from 'src/app/core/services/products.service';

interface DashboardSummaryCard {
  label: string;
  value: string | number;
  subLabel?: string;
  icon: string;
  className: string;
}

interface ServiceDetailRow {
  id: number;
  name: string;
  unitPrice: number;
  quantity: number;
  revenue: number;
  percentage: number;
  trendPct: number;
  assignedStylists: number;
  monthlyStylistsCount: number;
}

interface StylistPerformanceRow {
  id: number;
  name: string;
  image: string | null;
  totalServices: number;
  revenue: number;
  percentageOfTotal: number;
  servicesById: Record<number, number>;
}

interface StylistServiceMonthlyRow {
  stylistId: number;
  stylistName: string;
  stylistImage: string | null;
  serviceId: number;
  serviceName: string;
  unitPrice: number;
  monthlyTotal: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent {
  loading = true;

  reservations: GetReservations[] = [];
  reservationStatuses: getReservationStatuses[] = [];
  specialists: GetSpecialists[] = [];

  servicesCatalog: SalonServiceBrief[] = [];
  servicePriceMap = new Map<number, number>();
  specialistServiceIdsMap = new Map<number, number[]>();
  reservationServiceCacheById = new Map<number, number>();
  reservationServiceCacheByFingerprint = new Map<string, number>();
  private readonly reservationServiceCacheKey =
    'calendarReservationServiceCacheV1';
  serviceHeaders: { id: number; name: string }[] = [];

  summaryCards: DashboardSummaryCard[] = [];
  monthSummaryRows: { label: string; value: string; icon: string }[] = [];

  serviceDetailRows: ServiceDetailRow[] = [];
  stylistPerformanceRows: StylistPerformanceRow[] = [];
  stylistServiceRows: StylistServiceMonthlyRow[] = [];
  selectedStylistFilterId: number | 'all' = 'all';
  topStylist: StylistPerformanceRow | null = null;

  servicesBarChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [],
  };

  servicesPieChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [],
  };

  chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: { color: '#f3f4f6' },
        grid: { color: 'rgba(17,24,39,0.06)' },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: '#f3f4f6',
        },
        grid: { color: 'rgba(17,24,39,0.06)' },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: '#f3f4f6',
          font: { size: 11 },
        },
      },
    },
  };

  pieChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '55%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#f3f4f6',
          font: { size: 11 },
          boxWidth: 10,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 14,
        },
      },
    },
  };

  private currentDate = new Date();
  private currentMonthReservations: GetReservations[] = [];

  constructor(
    private reservationsService: ReservationsService,
    private reservationStatusesService: ReservationStatusesService,
    private specialistsService: SpecialistsService,
    private salonServicesService: SalonServicesService,
    private productsService: ProductsService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.loadReservationServiceCache();
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading = true;

    forkJoin({
      reservations: this.reservationsService
        .getReservations()
        .pipe(catchError(() => of([]))),
      statuses: this.reservationStatusesService
        .getStatusReservations()
        .pipe(catchError(() => of([]))),
      services: this.salonServicesService
        .getServices()
        .pipe(catchError(() => of([]))),
      products: this.productsService
        .getProducts()
        .pipe(catchError(() => of([]))),
      specialists: this.getSpecialistsSource(),
    }).subscribe({
      next: ({ reservations, statuses, services, products, specialists }) => {
        const normalizedServicesCatalog =
          this.buildServicesCatalog(
            services as SalonServiceBrief[],
            products as any[]
          );

        this.reservations = reservations;
        this.reservationStatuses = statuses;
        this.servicesCatalog = normalizedServicesCatalog;
        this.specialists = specialists;

        this.buildServicePriceMap(
          normalizedServicesCatalog,
          products as any[]
        );
        this.loadSpecialistServiceAssignments().subscribe({
          next: () => this.buildDashboardAnalytics(),
          error: () => this.buildDashboardAnalytics(),
        });
      },
      error: (err) => {
        this.loading = false;
        this.openErrorModal(err, 'No se pudo cargar el dashboard.');
      },
    });
  }

  private getSpecialistsSource(): Observable<GetSpecialists[]> {
    const storedSpecialists = localStorage.getItem('specialists');

    if (storedSpecialists) {
      return of(JSON.parse(storedSpecialists));
    }

    return this.specialistsService.getSpecialists().pipe(
      catchError(() => of([])),
      catchError(() => of([]))
    );
  }

  private buildDashboardAnalytics() {
    const monthReservations = this.filterCurrentMonth(this.reservations);
    const prevMonthReservations = this.filterPreviousMonth(this.reservations);

    const cancelledIds = this.getStatusIdsByName(['cancelada']);
    const completedIds = this.getStatusIdsByName(['completada']);

    const monthNonCancelled = monthReservations.filter(
      (r) => !cancelledIds.includes(r.statusId)
    );

    const monthCompleted = completedIds.length
      ? monthReservations.filter((r) => completedIds.includes(r.statusId))
      : monthNonCancelled;

    const monthAnalyticsBase = monthNonCancelled;
    this.currentMonthReservations = monthAnalyticsBase;

    const uniqueClients = new Set(
      monthAnalyticsBase.map((r) => r.customerId)
    ).size;

    const revenue = monthAnalyticsBase.reduce(
      (acc, reservation) =>
        acc + this.resolveReservationPrice(reservation),
      0
    );

    const averageTicket =
      monthAnalyticsBase.length > 0
        ? revenue / monthAnalyticsBase.length
        : 0;

    const activeStylists = new Set(
      monthAnalyticsBase.map((r) => r.specialistId)
    ).size;

    const newClientsThisMonth = this.countNewClientsThisMonth(
      this.reservations,
      monthAnalyticsBase
    );

    this.summaryCards = [
      {
        label: 'Servicios realizados',
        value: monthAnalyticsBase.length,
        icon: '✂️',
        className: 'kpi-services',
      },
      {
        label: 'Clientes atendidos',
        value: uniqueClients,
        icon: '👥',
        className: 'kpi-clients',
      },
      {
        label: 'Ingresos del mes',
        value: `S/. ${revenue.toFixed(2)}`,
        icon: '💵',
        className: 'kpi-revenue',
      },
      {
        label: 'Citas realizadas',
        value: monthNonCancelled.length,
        icon: '📅',
        className: 'kpi-appointments',
      },
    ];

    this.monthSummaryRows = [
      {
        label: 'Ingresos totales',
        value: `S/. ${revenue.toFixed(2)}`,
        icon: '💰',
      },
      {
        label: 'Ticket promedio',
        value: `S/. ${averageTicket.toFixed(2)}`,
        icon: '🧾',
      },
      {
        label: 'Clientes nuevos',
        value: String(newClientsThisMonth),
        icon: '🆕',
      },
      {
        label: 'Estilistas activos',
        value: String(activeStylists),
        icon: '🏅',
      },
    ];

    const currentServiceStats = this.groupReservationsByService(
      monthAnalyticsBase
    );
    const previousServiceStats = this.groupReservationsByService(
      prevMonthReservations
    );

    const totalCurrentServices = monthAnalyticsBase.length;

    this.serviceDetailRows = currentServiceStats
      .map((serviceStat) => {
        const previous = previousServiceStats.find(
          (row) => row.id === serviceStat.id
        );

        const trendPct = this.calculateTrendPercent(
          serviceStat.quantity,
          previous?.quantity ?? 0
        );

        return {
          ...serviceStat,
          percentage:
            totalCurrentServices > 0
              ? (serviceStat.quantity / totalCurrentServices) * 100
              : 0,
          trendPct,
          assignedStylists: 0,
          monthlyStylistsCount: 0,
        };
      })
      .sort((a, b) => b.quantity - a.quantity);

    this.buildServiceCharts(this.serviceDetailRows);
    this.buildStylistPerformance(monthAnalyticsBase);
    this.buildStylistServiceRows(monthAnalyticsBase);
    this.loadServiceMonthlySummaries();
  }

  private buildServiceCharts(rows: ServiceDetailRow[]) {
    const labels = rows.map((r) => r.name);
    const values = rows.map((r) => r.quantity);

    this.servicesBarChartData = {
      labels,
      datasets: [
        {
          label: 'Cantidad de servicios',
          data: values,
          borderRadius: 6,
          backgroundColor: '#7c5ce5',
          hoverBackgroundColor: '#6b4fd4',
        },
      ],
    };

    this.servicesPieChartData = {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: [
            '#7c5ce5',
            '#e55db1',
            '#4f8fe9',
            '#f5b23e',
            '#43b57d',
            '#45bcc9',
            '#9ca3af',
            '#0ea5e9',
          ],
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    };
  }

  private buildStylistPerformance(
    reservations: GetReservations[]
  ) {
    const map = new Map<number, StylistPerformanceRow>();

    this.specialists.forEach((specialist) => {
      map.set(specialist.id, {
        id: specialist.id,
        name: `${specialist.firstName} ${specialist.lastName}`.trim(),
        image: specialist.profileImageUrl || null,
        totalServices: 0,
        revenue: 0,
        percentageOfTotal: 0,
        servicesById: {},
      });
    });

    reservations.forEach((reservation) => {
      const id = reservation.specialistId;
      const specialist = this.specialists.find((s) => s.id === id);
      const fallbackName = reservation.specialistName || `Especialista #${id}`;
      const name = specialist
        ? `${specialist.firstName} ${specialist.lastName}`.trim()
        : fallbackName;

      const current = map.get(id) || {
        id,
        name,
        image: specialist?.profileImageUrl || null,
        totalServices: 0,
        revenue: 0,
        percentageOfTotal: 0,
        servicesById: {},
      };

      const serviceId = this.resolveReservationServiceId(reservation);

      if (serviceId) {
        current.servicesById[serviceId] =
          (current.servicesById[serviceId] || 0) + 1;
      }

      current.totalServices += 1;
      current.revenue += this.resolveReservationPrice(reservation);

      map.set(id, current);
    });

    const totalServices = reservations.length;

    this.stylistPerformanceRows = Array.from(map.values())
      .map((row) => ({
        ...row,
        percentageOfTotal:
          totalServices > 0
            ? (row.totalServices / totalServices) * 100
            : 0,
      }))
      .sort((a, b) => b.totalServices - a.totalServices);

    this.topStylist = this.stylistPerformanceRows[0] || null;
  }

  private buildStylistServiceRows(
    reservations: GetReservations[]
  ) {
    const grouped = new Map<string, StylistServiceMonthlyRow>();

    reservations.forEach((reservation) => {
      const stylistId = reservation.specialistId;
      const specialist = this.specialists.find(
        (item) => item.id === stylistId
      );
      const stylistName = specialist
        ? `${specialist.firstName} ${specialist.lastName}`.trim()
        : reservation.specialistName || `Especialista #${stylistId}`;
      const stylistImage = specialist?.profileImageUrl || null;
      const serviceId =
        this.resolveReservationServiceId(reservation) ?? 0;
      const serviceName = this.resolveReservationServiceName(
        reservation,
        serviceId
      );
      const unitPrice = this.resolveReservationPrice(reservation);
      const key = `${stylistId}|${serviceId}|${serviceName}`;

      const current = grouped.get(key) || {
        stylistId,
        stylistName,
        stylistImage,
        serviceId,
        serviceName,
        unitPrice,
        monthlyTotal: 0,
      };

      current.monthlyTotal += 1;

      if (current.unitPrice <= 0 && unitPrice > 0) {
        current.unitPrice = unitPrice;
      }

      grouped.set(key, current);
    });

    this.specialists.forEach((specialist) => {
      const assignedServiceIds =
        this.specialistServiceIdsMap.get(specialist.id) || [];

      assignedServiceIds.forEach((serviceId) => {
        const serviceName = this.getServiceNameById(serviceId);
        const key = `${specialist.id}|${serviceId}|${serviceName}`;

        if (grouped.has(key)) {
          return;
        }

        grouped.set(key, {
          stylistId: specialist.id,
          stylistName: `${specialist.firstName} ${specialist.lastName}`.trim(),
          stylistImage: specialist.profileImageUrl || null,
          serviceId,
          serviceName,
          unitPrice: this.servicePriceMap.get(serviceId) || 0,
          monthlyTotal: 0,
        });
      });
    });

    this.stylistServiceRows = Array.from(grouped.values()).sort((a, b) => {
      if (b.monthlyTotal !== a.monthlyTotal) {
        return b.monthlyTotal - a.monthlyTotal;
      }

      return a.stylistName.localeCompare(b.stylistName);
    });
  }

  private loadServiceMonthlySummaries() {
    const headerServices = this.resolveServiceHeaders();

    if (headerServices.length === 0) {
      this.serviceHeaders = [];
      this.loading = false;
      return;
    }

    this.serviceHeaders = headerServices;

    const requests = headerServices.map((service) =>
      this.salonServicesService.getServiceMonthlySummary(service.id)
    );

    forkJoin(requests)
      .pipe(catchError(() => of([] as ServiceMonthlySummary[])))
      .subscribe((summaries) => {
        const map = new Map<number, ServiceMonthlySummary>();

        summaries.forEach((summary) => {
          map.set(summary.serviceId, summary);
        });

        this.serviceDetailRows = this.serviceDetailRows.map((row) => {
          const summary = map.get(row.id);
          const monthlyStylistsCount = new Set(
            this.currentMonthReservations
              .filter(
                (reservation) =>
                  this.resolveReservationServiceId(reservation) ===
                  row.id
              )
              .map((reservation) => reservation.specialistId)
          ).size;

          return {
            ...row,
            assignedStylists: summary?.stylists?.length ?? 0,
            monthlyStylistsCount,
          };
        });

        this.loading = false;
      });
  }

  private resolveServiceHeaders() {
    const fromServiceApi = this.servicesCatalog.map((service) => ({
      id: service.id,
      name: service.name,
    }));

    const hasUnassignedReservations = this.reservations.some(
      (reservation) =>
        !this.resolveReservationServiceId(reservation)
    );

    if (fromServiceApi.length > 0) {
      const dedup = new Map<number, string>();

      fromServiceApi.forEach((service) => {
        dedup.set(service.id, service.name);
      });

      if (hasUnassignedReservations) {
        dedup.set(0, 'Sin servicio asignado');
      }

      return Array.from(dedup.entries()).map(([id, name]) => ({
        id,
        name,
      }));
    }

    const unique = new Map<number, string>();

    this.reservations.forEach((reservation) => {
      const serviceId = reservation.service?.id;
      const serviceName = reservation.service?.name;

      if (serviceId && serviceName) {
        unique.set(serviceId, serviceName);
      }
    });

    if (hasUnassignedReservations) {
      unique.set(0, 'Sin servicio asignado');
    }

    return Array.from(unique.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }

  private groupReservationsByService(
    reservations: GetReservations[]
  ): ServiceDetailRow[] {
    const map = new Map<
      number,
      {
        id: number;
        name: string;
        unitPrice: number;
        quantity: number;
        revenue: number;
      }
    >();

    reservations.forEach((reservation) => {
      const serviceId =
        this.resolveReservationServiceId(reservation) ?? 0;

      const serviceName = this.resolveReservationServiceName(
        reservation,
        serviceId
      );

      const unitPrice = this.resolveReservationPrice(reservation);

      const current = map.get(serviceId) || {
        id: serviceId,
        name: serviceName,
        unitPrice,
        quantity: 0,
        revenue: 0,
      };

      current.quantity += 1;
      current.revenue += unitPrice;

      if (current.unitPrice <= 0 && unitPrice > 0) {
        current.unitPrice = unitPrice;
      }

      if (
        current.name === 'Sin servicio asignado' &&
        serviceName !== 'Sin servicio asignado'
      ) {
        current.name = serviceName;
      }

      map.set(serviceId, current);
    });

    return Array.from(map.values()).map((row) => ({
      ...row,
      percentage: 0,
      trendPct: 0,
      assignedStylists: 0,
      monthlyStylistsCount: 0,
    }));
  }

  private loadSpecialistServiceAssignments(): Observable<void> {
    const ids = this.servicesCatalog
      .map((service) => service.id)
      .filter((id) => id > 0);

    if (ids.length === 0) {
      this.specialistServiceIdsMap = new Map<number, number[]>();
      return of(void 0);
    }

    const requests = ids.map((serviceId) =>
      this.salonServicesService.getServiceStylists(serviceId).pipe(
        catchError(() => of([])),
      )
    );

    return forkJoin(requests).pipe(
      catchError(() => of([])),
      (source) =>
        new Observable<void>((observer) => {
          source.subscribe((responses: any[]) => {
            const map = new Map<number, number[]>();

            responses.forEach((response, index) => {
              const serviceId = ids[index];
              const stylists = this.normalizeStylistsResponse(response);

              stylists.forEach((stylist: any) => {
                const specialistId = Number(stylist?.id);
                if (!Number.isFinite(specialistId) || specialistId <= 0) {
                  return;
                }

                const list = map.get(specialistId) || [];
                if (!list.includes(serviceId)) {
                  list.push(serviceId);
                }
                map.set(specialistId, list);
              });
            });

            this.specialistServiceIdsMap = map;
            observer.next();
            observer.complete();
          });
        })
    );
  }

  private normalizeStylistsResponse(response: unknown): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (
      response &&
      typeof response === 'object' &&
      Array.isArray((response as any).stylists)
    ) {
      return (response as any).stylists;
    }

    return [];
  }

  private buildServicePriceMap(
    services: SalonServiceBrief[],
    products: any[]
  ) {
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
      const price = Number(product?.price ?? product?.Price ?? 0);

      if (Number.isFinite(id) && id > 0 && Number.isFinite(price)) {
        this.servicePriceMap.set(id, price);
      }
    });

    services.forEach((service) => {
      if (!this.servicePriceMap.has(service.id)) {
        this.servicePriceMap.set(service.id, 0);
      }
    });
  }

  private buildServicesCatalog(
    services: SalonServiceBrief[],
    products: any[]
  ): SalonServiceBrief[] {
    const catalog = new Map<number, SalonServiceBrief>();

    (Array.isArray(services) ? services : []).forEach(
      (service) => {
        if (service?.id > 0 && service?.name) {
          catalog.set(service.id, {
            id: service.id,
            name: service.name,
            description: service.description,
          });
        }
      }
    );

    (Array.isArray(products) ? products : []).forEach(
      (product: any) => {
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
        const name = String(
          product?.name || product?.Name || ''
        ).trim();
        const description = String(
          product?.description || product?.Description || ''
        ).trim();

        if (!Number.isFinite(id) || id <= 0 || !name) {
          return;
        }

        if (!catalog.has(id)) {
          catalog.set(id, {
            id,
            name,
            description,
          });
        }
      }
    );

    return Array.from(catalog.values());
  }

  private resolveReservationServiceId(
    reservation: GetReservations
  ): number | null {
    const rawId = Number(
      (reservation as any)?.serviceId ?? reservation.service?.id ?? 0
    );

    if (Number.isFinite(rawId) && rawId > 0) {
      return rawId;
    }

    const cacheServiceId = this.resolveServiceIdFromCache(reservation);
    if (cacheServiceId !== null) {
      return cacheServiceId;
    }

    const rawName = String(
      reservation.service?.name || (reservation as any)?.serviceName || ''
    ).trim().toLowerCase();

    if (rawName) {
      const byName = this.servicesCatalog.find(
        (service) =>
          service.name.trim().toLowerCase() === rawName
      );

      if (byName) {
        return byName.id;
      }
    }

    const specialistId = Number(reservation.specialistId);
    const servicesByStylist = this.specialistServiceIdsMap.get(specialistId) || [];

    if (servicesByStylist.length === 1) {
      return servicesByStylist[0];
    }

    return null;
  }

  private resolveServiceIdFromCache(
    reservation: GetReservations
  ): number | null {
    const reservationId = Number((reservation as any)?.id ?? 0);

    if (
      Number.isFinite(reservationId) &&
      reservationId > 0 &&
      this.reservationServiceCacheById.has(reservationId)
    ) {
      return this.reservationServiceCacheById.get(reservationId) || null;
    }

    const fingerprint = this.buildReservationFingerprint(reservation);
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

  private buildReservationFingerprint(
    reservation: GetReservations
  ): string {
    const customerId = Number(reservation.customerId ?? 0);
    const specialistId = Number(reservation.specialistId ?? 0);
    const reservedAt = String(reservation.reservedAt || '').trim();
    const hourAt = String(reservation.hourAt || '').trim();

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
      const raw = localStorage.getItem(
        this.reservationServiceCacheKey
      );

      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      const byIdEntries = Array.isArray(parsed?.byId)
        ? parsed.byId
        : [];
      const byFingerprintEntries = Array.isArray(
        parsed?.byFingerprint
      )
        ? parsed.byFingerprint
        : [];

      this.reservationServiceCacheById = new Map(byIdEntries);
      this.reservationServiceCacheByFingerprint = new Map(
        byFingerprintEntries
      );
    } catch (error) {
      console.error(
        '[Dashboard] error leyendo cache de servicio',
        error
      );
    }
  }

  private resolveReservationServiceName(
    reservation: GetReservations,
    serviceId: number
  ): string {
    const serviceName = String(
      reservation.service?.name || (reservation as any)?.serviceName || ''
    ).trim();

    if (serviceName) {
      return serviceName;
    }

    if (serviceId > 0) {
      const fromCatalog = this.servicesCatalog.find((s) => s.id === serviceId);
      if (fromCatalog?.name) {
        return fromCatalog.name;
      }

      return `Servicio #${serviceId}`;
    }

    return 'Sin servicio asignado';
  }

  private getServiceNameById(serviceId: number): string {
    const fromCatalog = this.servicesCatalog.find(
      (service) => service.id === serviceId
    );

    if (fromCatalog?.name) {
      return fromCatalog.name;
    }

    if (serviceId > 0) {
      return `Servicio ${serviceId}`;
    }

    return 'Sin servicio asignado';
  }

  private resolveReservationPrice(
    reservation: GetReservations
  ): number {
    const directPrice = Number(reservation.service?.price ?? 0);

    if (Number.isFinite(directPrice) && directPrice > 0) {
      return directPrice;
    }

    const serviceId = this.resolveReservationServiceId(reservation);
    if (
      serviceId &&
      this.servicePriceMap.has(serviceId)
    ) {
      return this.servicePriceMap.get(serviceId) || 0;
    }

    return 0;
  }

  private getStatusIdsByName(names: string[]) {
    return this.reservationStatuses
      .filter((status) =>
        names.some((name) =>
          status.name.toLowerCase().includes(name)
        )
      )
      .map((status) => status.id);
  }

  private countNewClientsThisMonth(
    allReservations: GetReservations[],
    monthReservations: GetReservations[]
  ) {
    const firstReservationByClient = new Map<number, Date>();

    allReservations.forEach((reservation) => {
      const date = new Date(reservation.reservedAt);
      const saved = firstReservationByClient.get(
        reservation.customerId
      );

      if (!saved || date < saved) {
        firstReservationByClient.set(
          reservation.customerId,
          date
        );
      }
    });

    const monthClientIds = new Set(
      monthReservations.map((reservation) => reservation.customerId)
    );

    let count = 0;

    monthClientIds.forEach((clientId) => {
      const firstDate = firstReservationByClient.get(clientId);

      if (
        firstDate &&
        firstDate.getMonth() === this.currentDate.getMonth() &&
        firstDate.getFullYear() ===
          this.currentDate.getFullYear()
      ) {
        count += 1;
      }
    });

    return count;
  }

  private filterCurrentMonth(
    reservations: GetReservations[]
  ) {
    return reservations.filter((reservation) => {
      const date = new Date(reservation.reservedAt);

      return (
        date.getMonth() === this.currentDate.getMonth() &&
        date.getFullYear() ===
          this.currentDate.getFullYear()
      );
    });
  }

  private filterPreviousMonth(
    reservations: GetReservations[]
  ) {
    const previousMonthDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() - 1,
      1
    );

    return reservations.filter((reservation) => {
      const date = new Date(reservation.reservedAt);

      return (
        date.getMonth() === previousMonthDate.getMonth() &&
        date.getFullYear() ===
          previousMonthDate.getFullYear()
      );
    });
  }

  private calculateTrendPercent(current: number, previous: number) {
    if (previous <= 0) {
      return current > 0 ? 100 : 0;
    }

    return ((current - previous) / previous) * 100;
  }

  getStylistServiceCount(
    stylist: StylistPerformanceRow,
    serviceId: number
  ) {
    return stylist.servicesById[serviceId] || 0;
  }

  get filteredStylistServiceRows() {
    if (this.selectedStylistFilterId === 'all') {
      return this.stylistServiceRows;
    }

    return this.stylistServiceRows.filter(
      (row) => row.stylistId === this.selectedStylistFilterId
    );
  }

  getAvatarText(name: string) {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  getTrendClass(trendPct: number) {
    if (trendPct > 0) {
      return 'trend-up';
    }

    if (trendPct < 0) {
      return 'trend-down';
    }

    return 'trend-neutral';
  }

  private openErrorModal(err: unknown, defaultMsg: string) {
    const anyError = err as any;
    const message =
      anyError?.error?.detail ||
      anyError?.error?.message ||
      anyError?.error?.title ||
      defaultMsg;

    const modalRef = this.modalService.open(
      NotificationModalComponent,
      {
        centered: true,
      }
    );

    modalRef.componentInstance.title = 'Error';
    modalRef.componentInstance.message = message;
    modalRef.componentInstance.type = 'error';
  }
}
