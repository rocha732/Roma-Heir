import { Component, OnDestroy, OnInit } from '@angular/core';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { Subject } from 'rxjs';
import { ReservationsService } from 'src/app/core/services/reservations.service';
import { SalonServicesService } from 'src/app/core/services/salon-services.service';
import {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { addMinutes } from 'date-fns';

import { isSameDay, isSameMonth } from 'date-fns';
import { GetReservations } from 'src/app/core/models/reservations';
import { UsersService } from 'src/app/core/services/users.service';
import { ResponseUsers } from 'src/app/core/models/users';
import { es } from 'date-fns/locale';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NotificationModalComponent } from 'src/app/components/notification-modal/notification-modal.component';
import { SpecialistsService } from 'src/app/core/services/specialists.service';
import { ProductsService } from 'src/app/core/services/products.service';
import { ProcessingOverlayService } from 'src/app/core/services/processing-overlay.service';

@Component({
  selector: 'app-calendar-reservations',
  templateUrl: './calendar-reservations.component.html',
  styleUrls: ['./calendar-reservations.component.scss'],
})
export class CalendarReservationsComponent implements OnInit, OnDestroy {
  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView;
  DEFAULT_DURATION_MINUTES = 30;
  loading = true;
  selectedStatusId: number | null = null;
  selectedSpecialistId: number | null = null;

  viewDate: Date = new Date();
  events: CalendarEvent[] = [];
  selectedDate!: Date;
  selectedDayEvents: CalendarEvent[] = [];
  reservations: GetReservations[] = [];
  allReservations: GetReservations[] = [];
  rawReservations: GetReservations[] = [];
  users: ResponseUsers[] = [];
  refresh = new Subject<void>();
  specialistsMap = new Map<number, string>();
  usersMap = new Map<number, any>();
  serviceNamesMap = new Map<number, string>();
  specialistServiceIdsMap = new Map<number, number[]>();
  reservationServiceCacheById = new Map<number, number>();
  reservationServiceCacheByFingerprint = new Map<string, number>();
  private readonly reservationServiceCacheKey =
    'calendarReservationServiceCacheV1';
  statusesMap = new Map<number, string>([
    [1, 'Pendiente'],
    [2, 'Confirmada'],
    [3, 'Cancelada'],
    [4, 'Completada'],
    [5, 'Ausente'],
    [6, 'Reprogramada'],
  ]);
  statusColors: Record<number, { primary: string; secondary: string }> = {
    1: { primary: '#ffc107', secondary: '#fff3cd' }, // Pendiente (amarillo)
    2: { primary: '#0d6efd', secondary: '#cfe2ff' }, // Confirmada (azul)
    3: { primary: '#dc3545', secondary: '#f8d7da' }, // Cancelada (rojo)
    4: { primary: '#198754', secondary: '#d1e7dd' }, // Completada (verde)
    5: { primary: '#fd7e14', secondary: '#ffe5d0' }, // Ausente (naranja, más visible)
    6: { primary: '#0dcaf0', secondary: '#cff4fc' }, // Reprogramada (celeste)
  };

  statuses = [
    { id: 1, name: 'Pendiente' },
    { id: 2, name: 'Confirmada' },
    { id: 3, name: 'Cancelada' },
    { id: 4, name: 'Completada' },
    { id: 5, name: 'Ausente' },
    { id: 6, name: 'Reprogramada' },
  ];

  hourSegments = 2; // 30 minutos por bloque
  dayStartHour = 9; // 9 AM
  dayEndHour = 20; // 8 PM
  locale: string = 'es';
  showReprogramModal = false;

  reprogramData: {
    reservationId: number | null;
    date: string;
    hour: string;
    id: string;
  } = {
    reservationId: null,
    date: '',
    hour: '',
    id: '',
  };

  todayString = '';
  availableHours: string[] = [];

  showCreateModal = false;
  showEventDetailModal = false;
  showDayEventsModal = false;
  selectedEventDetail: any = null;

  createReservationData = {
    customerId: null,
    serviceId: null,
    specialistId: null,
    requiresPersonalAdvice: false,
    hourAt: '',
    reservedAt: '',
  };

  services: any[] = [];
  specialists: any[] = [];
  customers: any[] = [];
  allServices: any[] = [];
  filteredServices: any[] = [];
  filteredSpecialists: any[] = [];
  private currentFilteredReservations: GetReservations[] = [];
  private reservationSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly reservationSyncMaxAttempts = 8;
  private readonly reservationSyncDelayMs = 1200;

  constructor(
    private specialistsService: SpecialistsService,
    private reservationsService: ReservationsService,
    private modalService: NgbModal,
    private usersService: UsersService,
    private salonServicesService: SalonServicesService,
    private productsService: ProductsService,
    private processingOverlay: ProcessingOverlayService,
  ) {}

  ngOnInit(): void {
    this.loadReservationServiceCache();
    this.loadSpecialists();
    this.loadServices();
    this.loadReservations();
    this.loading = true;
  }

  ngOnDestroy(): void {
    this.clearReservationSyncTimer();
    this.processingOverlay.hide();
  }

  loadReservations() {
    console.log('[CalendarReservations] loadReservations() -> solicitando /Reservations');

    this.reservationsService.getReservations().subscribe({
      next: (reservations) => {
        console.log('[CalendarReservations] /Reservations OK. total:', reservations?.length ?? 0);
        console.log('[CalendarReservations] muestra de reservaciones:', (reservations ?? []).slice(0, 5));

        this.rawReservations = reservations;
        // 👇 cuando usuarios estén listos, ahí se arma TODO
        this.loadUsers();
      },
      error: (err) => {
        console.error('[CalendarReservations] /Reservations ERROR', err);
        this.loading = false;
      },
    });
  }

  onEventClicked(event: CalendarEvent) {
    this.selectedEventDetail = event.meta;
    this.showEventDetailModal = true;
  }

  closeEventDetailModal() {
    this.showEventDetailModal = false;
    this.selectedEventDetail = null;
  }

  closeDayEventsModal() {
    this.showDayEventsModal = false;
  }

  prev() {
    switch (this.view) {
      case CalendarView.Month:
        this.viewDate = subMonths(this.viewDate, 1);
        break;

      case CalendarView.Week:
        this.viewDate = subWeeks(this.viewDate, 1);
        break;

      case CalendarView.Day:
        this.viewDate = subDays(this.viewDate, 1);
        break;
    }

    this.selectedDayEvents = [];
  }

  next() {
    switch (this.view) {
      case CalendarView.Month:
        this.viewDate = addMonths(this.viewDate, 1);
        break;

      case CalendarView.Week:
        this.viewDate = addWeeks(this.viewDate, 1);
        break;

      case CalendarView.Day:
        this.viewDate = addDays(this.viewDate, 1);
        break;
    }

    this.selectedDayEvents = [];
  }

  today() {
    this.viewDate = new Date();
    this.selectedDayEvents = [];
  }

  onDayClicked(date: Date) {
    this.selectedDate = date;

    this.selectedDayEvents = this.events.filter((e) =>
      isSameDay(e.start, date)
    );

    if (
      this.view === CalendarView.Month &&
      this.selectedDayEvents.length > 0
    ) {
      this.showDayEventsModal = true;
    }
  }

  onMiniDateChange(value: string) {
    if (!value) {
      return;
    }

    const date = this.parseLocalDate(value);
    this.viewDate = date;
    this.onDayClicked(date);
  }

  loadSpecialists() {
    this.specialistsService.getSpecialists().subscribe({
      next: (specialists) => {
        this.specialists = specialists;
        specialists.forEach((s: any) => {
          const specialistId = this.toPositiveNumberOrNull(
            s?.id
          );

          if (specialistId === null) {
            return;
          }

          const fullName = `${s.firstName} ${s.lastName}`;
          this.specialistsMap.set(
            specialistId,
            fullName
          );
        });
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  mapServicesToSpecialists() {
    this.specialistServiceIdsMap = new Map<number, number[]>();

    this.specialists.forEach((specialist: any) => {
      const specialistId = this.toPositiveNumberOrNull(
        specialist?.id
      );

      if (specialistId === null) {
        return;
      }

      specialist.services = [];
      this.services.forEach((service: any) => {
        const exists = service.stylists?.some(
          (s: any) =>
            this.toPositiveNumberOrNull(s?.id) ===
            specialistId
        );
        if (exists) {
          specialist.services.push({
            id: service.id,
            name: service.name
          });
        }
      });

      const uniqueServiceIds: number[] = Array.from(
        new Set<number>(
          (specialist.services || [])
            .map((srv: any) => this.toNumberOrNull(srv?.id))
            .filter((id: number | null): id is number => id !== null)
        )
      );

      this.specialistServiceIdsMap.set(
        specialistId,
        uniqueServiceIds
      );
    });

    console.log('SPECIALISTS WITH SERVICES', this.specialists);
  }

  loadServices() {
    this.salonServicesService.getServices().subscribe({
      next: (services: any[]) => {
        const normalized = Array.isArray(services)
          ? services
          : [];

        if (normalized.length === 0) {
          this.loadServicesFromProductsFallback();
          return;
        }

        this.bindStylistsToServices(normalized);
      },
      error: () => {
        this.loadServicesFromProductsFallback();
      },
    });
  }

  private loadServicesFromProductsFallback() {
    this.productsService.getProducts().subscribe({
      next: (items: any[]) => {
        const serviceItems = (Array.isArray(items)
          ? items
          : []
        ).filter((item) => {
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

        this.bindStylistsToServices(serviceItems);
      },
      error: (err) => {
        console.error(err);
      },
    });
  }

  private bindStylistsToServices(services: any[]) {
    this.serviceNamesMap = new Map<number, string>();
    services.forEach((service: any) => {
      const serviceId = this.toPositiveNumberOrNull(
        service?.id
      );
      const serviceName = this.getServiceDisplayName(service);
      if (serviceId !== null && serviceName) {
        this.serviceNamesMap.set(serviceId, serviceName);
      }
    });

    this.services = [];

    services.forEach((service: any) => {
      this.salonServicesService
        .getServiceStylists(service.id)
        .subscribe({
          next: (response: any) => {
            const stylists = this.normalizeStylistsResponse(
              response
            );

            this.services.push({
              ...service,
              stylists,
            });

            this.mapServicesToSpecialists();

            if (
              this.rawReservations.length > 0 &&
              this.usersMap.size > 0
            ) {
              this.mapReservationsAndEvents();
            }
          },
          error: (err) => {
            console.error(err);
          },
        });
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

  loadUsers() {
    this.usersService.getUsers().subscribe((users) => {
      this.users = users; 
      users.forEach((u) => {
        this.usersMap.set(u.id, {
          name: `${u.firstName} ${u.lastName}`,
          email: u.email,
          phone: u.phone,
        });
      });

      this.mapReservationsAndEvents();
    });
  }

  mapReservationsAndEvents() {
    // 1️⃣ Mapeo reservas enriquecidas
    this.reservations = this.rawReservations
      .filter((r) => r != null) // 🔹 evita nulos
      .map((r) => {
        const user = this.usersMap.get(r.customerId);
        const specialist = this.specialistsMap.get(r.specialistId);

        return {
          ...r,
          customerName: user?.name ?? '—',
          customerEmail: user?.email ?? '—',
          customerPhone: user?.phone ?? '—',
          specialistName: specialist ?? '—',
          serviceName: this.resolveServiceName(r),
        };
      });

    const unresolved = this.reservations.filter(
      (r: any) => r.serviceName === 'Sin servicio'
    );
    console.log('[CalendarReservations] reservas sin servicio (despues de map):', unresolved.length);
    if (unresolved.length > 0) {
      console.log('[CalendarReservations] muestra reservas sin servicio:', unresolved.slice(0, 5));
    }

    this.allReservations = [...this.reservations];

    this.applyFilters();
    this.loading = false;
    this.refresh.next();
  }

  private buildEvents(reservations: GetReservations[]) {
    return reservations.map((r) => {
      const start = this.buildDate(r.reservedAt, r.hourAt);
      const end = this.buildEndDate(start);

      const color = this.statusColors[r.statusId] ?? {
        primary: '#343a40',
        secondary: '#f8f9fa',
      };

      return {
        start,
        end,
        title: `${r.customerName} • ${
          this.resolveServiceName(r)
        }`,
        color,
        meta: {
          ...r,
          serviceName: this.resolveServiceName(r),
          start,
          end,
        },
      };
    });
  }

  private resolveServiceName(reservation: any): string {
    const nestedServiceName =
      reservation?.service?.name || reservation?.service?.Name;

    if (
      typeof nestedServiceName === 'string' &&
      nestedServiceName.trim().length > 0
    ) {
      return nestedServiceName.trim();
    }

    const explicitName =
      reservation?.serviceName || reservation?.productName;

    if (typeof explicitName === 'string') {
      const normalizedName = explicitName.trim();
      if (
        normalizedName.length > 0 &&
        normalizedName.toLowerCase() !==
          'sin servicio'
      ) {
        return normalizedName;
      }
    }

    const serviceId =
      this.extractServiceId(reservation) ??
      this.resolveServiceIdFromCache(reservation) ??
      this.resolveServiceIdBySpecialist(reservation);

    if (
      typeof serviceId === 'number' &&
      this.serviceNamesMap.has(serviceId)
    ) {
      return this.serviceNamesMap.get(serviceId) as string;
    }

    console.warn('[CalendarReservations] servicio no resuelto para reservacion:', {
      reservationId: reservation?.id,
      serviceId: reservation?.serviceId,
      ServiceId: reservation?.ServiceId,
      productId: reservation?.productId,
      ProductId: reservation?.ProductId,
      nestedServiceId: reservation?.service?.id,
      nestedServiceName: reservation?.service?.name,
      nestedProductId: reservation?.product?.id,
      productName: reservation?.productName,
      fingerprint: this.buildReservationFingerprint(reservation),
    });

    return 'Sin servicio';
  }

  private extractServiceId(source: any): number | null {
    const candidate =
      source?.serviceId ??
      source?.ServiceId ??
      source?.productId ??
      source?.ProductId ??
      source?.service?.id ??
      source?.product?.id;

    return this.toPositiveNumberOrNull(candidate);
  }

  private toPositiveNumberOrNull(
    value: unknown
  ): number | null {
    const parsed = this.toNumberOrNull(value);

    if (parsed === null || parsed <= 0) {
      return null;
    }

    return parsed;
  }

  private toNumberOrNull(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private getServiceDisplayName(service: any): string {
    const rawName =
      service?.name ||
      service?.Name ||
      service?.title ||
      service?.Title;

    return typeof rawName === 'string'
      ? rawName.trim()
      : '';
  }

  private resolveServiceIdFromCache(
    reservation: any
  ): number | null {
    const reservationId = this.toNumberOrNull(
      reservation?.id
    );

    if (
      reservationId !== null &&
      this.reservationServiceCacheById.has(reservationId)
    ) {
      return (
        this.reservationServiceCacheById.get(
          reservationId
        ) ?? null
      );
    }

    const fingerprint =
      this.buildReservationFingerprint(reservation);

    if (
      fingerprint &&
      this.reservationServiceCacheByFingerprint.has(
        fingerprint
      )
    ) {
      return (
        this.reservationServiceCacheByFingerprint.get(
          fingerprint
        ) ?? null
      );
    }

    return null;
  }

  private resolveServiceIdBySpecialist(
    reservation: any
  ): number | null {
    const specialistId = this.toNumberOrNull(
      reservation?.specialistId
    );

    if (specialistId === null) {
      return null;
    }

    const services =
      this.specialistServiceIdsMap.get(specialistId) || [];

    if (services.length === 1) {
      return services[0];
    }

    return null;
  }

  private buildReservationFingerprint(
    source: any
  ): string {
    const customerId = this.toNumberOrNull(
      source?.customerId
    );
    const specialistId = this.toNumberOrNull(
      source?.specialistId
    );
    const reservedAt = String(
      source?.reservedAt || ''
    ).trim();
    const hourAt = String(source?.hourAt || '').trim();

    if (
      customerId === null ||
      specialistId === null ||
      !reservedAt ||
      !hourAt
    ) {
      return '';
    }

    return `${customerId}|${specialistId}|${reservedAt}|${hourAt}`;
  }

  private saveServiceSelectionCache(
    serviceId: number,
    reservationId?: number | null,
    fingerprint?: string
  ) {
    if (reservationId != null) {
      this.reservationServiceCacheById.set(
        reservationId,
        serviceId
      );
    }

    if (fingerprint) {
      this.reservationServiceCacheByFingerprint.set(
        fingerprint,
        serviceId
      );
    }

    this.persistReservationServiceCache();
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

      this.reservationServiceCacheById = new Map(
        byIdEntries
      );
      this.reservationServiceCacheByFingerprint =
        new Map(byFingerprintEntries);

      console.log(
        '[CalendarReservations] cache de servicio cargado:',
        {
          byId: this.reservationServiceCacheById.size,
          byFingerprint:
            this.reservationServiceCacheByFingerprint
              .size,
        }
      );
    } catch (error) {
      console.error(
        '[CalendarReservations] error cargando cache de servicio',
        error
      );
    }
  }

  private persistReservationServiceCache() {
    const payload = {
      byId: Array.from(
        this.reservationServiceCacheById.entries()
      ),
      byFingerprint: Array.from(
        this.reservationServiceCacheByFingerprint.entries()
      ),
    };

    localStorage.setItem(
      this.reservationServiceCacheKey,
      JSON.stringify(payload)
    );
  }

  applyFilters() {
    let filtered = [...this.allReservations];

    if (this.selectedStatusId) {
      filtered = filtered.filter(
        (r) => r.statusId === this.selectedStatusId
      );
    }

    if (this.selectedSpecialistId) {
      filtered = filtered.filter(
        (r) =>
          r.specialistId === this.selectedSpecialistId
      );
    }

    this.currentFilteredReservations = filtered;
    this.events = this.buildEvents(filtered);
    this.selectedDayEvents = [];
    this.refresh.next();
  }

  getMonthCellCount(date: Date): number {
    return this.currentFilteredReservations.filter(
      (reservation) =>
        isSameDay(
          this.parseLocalDate(reservation.reservedAt),
          date
        )
    ).length;
  }

  getMonthCellDots(date: Date): number[] {
    return Array.from(
      { length: Math.min(this.getMonthCellCount(date), 3) },
      (_, index) => index
    );
  }

  getMonthCellEvents(date: Date): CalendarEvent[] {
    return this.events
      .filter((event) => isSameDay(event.start, date))
      .slice(0, 3);
  }

  getMonthCellMoreCount(date: Date): number {
    const totalEvents = this.events.filter((event) =>
      isSameDay(event.start, date)
    ).length;

    return Math.max(totalEvents - 3, 0);
  }

  isInCurrentMonth(date: Date): boolean {
    return isSameMonth(date, this.viewDate);
  }

  isSelectedMonthDate(date: Date): boolean {
    return !!this.selectedDate && isSameDay(date, this.selectedDate);
  }

  openDayEventsFromMonth(date: Date) {
    this.onDayClicked(date);
  }

  openEventDetailFromDayModal(event: CalendarEvent) {
    this.closeDayEventsModal();
    this.onEventClicked(event);
  }

  buildDate(date: string | Date, hour: string): Date {
    let baseDate: Date;

    if (date instanceof Date) {
      baseDate = new Date(date);
    } else {
      const [year, month, day] = date.split('-').map(Number);
      baseDate = new Date(year, month - 1, day);
    }

    const [h, m] = hour.split(':').map(Number);
    baseDate.setHours(h, m, 0, 0);

    return baseDate;
  }

  buildEndDate(start: Date, duration = this.DEFAULT_DURATION_MINUTES): Date {
    return addMinutes(start, duration);
  }

  getStatusName(statusId: number): string {
    return this.statusesMap.get(statusId) ?? 'Desconocido';
  }
  getStatusClass(statusId: number): string {
    switch (statusId) {
      case 1:
        return 'bg-warning text-dark'; // Pendiente
      case 2:
        return 'bg-blue'; // Confirmada
      case 3:
        return 'bg-danger'; // Cancelada
      case 4:
        return 'bg-success'; // Completada
      case 5:
        return 'bg-orange text-dark'; // Ausente (usa clase CSS que crees)
      case 6:
        return 'bg-info text-dark'; // Reprogramada
      default:
        return 'bg-dark';
    }
  }

  filterByStatus(statusId: number | null) {
    this.selectedStatusId = statusId;
    this.applyFilters();
  }

  filterBySpecialist(
    specialistId: number | null
  ) {
    this.selectedSpecialistId = specialistId;
    this.applyFilters();
  }

  getCurrentRangeLabel(): string {
    if (this.view === CalendarView.Month) {
      return format(this.viewDate, 'MMMM yyyy', {
        locale: es,
      });
    }

    if (this.view === CalendarView.Week) {
      const start = startOfWeek(this.viewDate, {
        weekStartsOn: 1,
      });
      const end = endOfWeek(this.viewDate, {
        weekStartsOn: 1,
      });

      return `${format(start, 'd', {
        locale: es,
      })} - ${format(end, 'd MMMM, yyyy', {
        locale: es,
      })}`;
    }

    return format(this.viewDate, 'd MMMM, yyyy', {
      locale: es,
    });
  }

  private countInCurrentRange(
    reservations: GetReservations[]
  ): number {
    let start: Date;
    let end: Date;

    if (this.view === CalendarView.Month) {
      start = startOfMonth(this.viewDate);
      end = endOfMonth(this.viewDate);
    } else if (this.view === CalendarView.Week) {
      start = startOfWeek(this.viewDate, {
        weekStartsOn: 1,
      });
      end = endOfWeek(this.viewDate, {
        weekStartsOn: 1,
      });
    } else {
      start = new Date(this.viewDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(this.viewDate);
      end.setHours(23, 59, 59, 999);
    }

    return reservations.filter((reservation) => {
      const date = this.parseLocalDate(
        reservation.reservedAt
      );

      return isWithinInterval(date, {
        start,
        end,
      });
    }).length;
  }

  get todayReservationsCount(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.allReservations.filter((reservation) => {
      const date = this.parseLocalDate(
        reservation.reservedAt
      );
      date.setHours(0, 0, 0, 0);
      return date.getTime() === today.getTime();
    }).length;
  }

  get weekReservationsCount(): number {
    const start = startOfWeek(new Date(), {
      weekStartsOn: 1,
    });
    const end = endOfWeek(new Date(), {
      weekStartsOn: 1,
    });

    return this.allReservations.filter((reservation) => {
      const date = this.parseLocalDate(
        reservation.reservedAt
      );

      return isWithinInterval(date, {
        start,
        end,
      });
    }).length;
  }

  get confirmedReservationsCount(): number {
    return this.countInCurrentRange(
      this.allReservations.filter((r) => r.statusId === 2)
    );
  }

  get cancelledReservationsCount(): number {
    return this.countInCurrentRange(
      this.allReservations.filter((r) => r.statusId === 3)
    );
  }

  isTodayOrFuture(reservedAt: string | Date): boolean {
    const date = this.parseLocalDate(reservedAt);
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    return date >= today;
  }
  parseLocalDate(date: string | Date): Date {
    if (date instanceof Date) {
      return new Date(date);
    }

    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  onChangeStatusFromCalendar(reservation: any, newStatusId: number) {
    console.log('🚩 onChangeStatusFromCalendar', reservation, newStatusId)  ;
    console.log('Cambiar estado', reservation.id, newStatusId);
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

  onReprogramFromCalendar(reservation: any) {
    this.todayString = this.formatDateInput(new Date());

    this.reprogramData = {
      reservationId: reservation.id,
      date: this.todayString,
      hour: '',
      id: reservation.id,
    };

    this.generateAvailableHours(this.reprogramData.date);
    this.showReprogramModal = true;
  }

  private openErrorModal(err: any, defaultMsg: string) {
    const message = err?.error?.detail || err?.error?.message || err?.error?.title || defaultMsg;
    const modalRef = this.modalService.open(NotificationModalComponent, { centered: true });
    modalRef.componentInstance.title = 'Error';
    modalRef.componentInstance.message = message;
    modalRef.componentInstance.type = 'error';
  }

  onReprogramDateChange() {
    this.reprogramData.hour = '';
    this.generateAvailableHours(
      this.createReservationData.reservedAt
    );
  }

  onCreateDateChange() {
    this.createReservationData.hourAt = '';

    this.generateAvailableHours(
      this.createReservationData.reservedAt
    );
  }

  generateAvailableHours(selectedDate: string) {
    const hours: string[] = [];
    const now = new Date();
    const isToday = selectedDate === this.formatDateInput(now);

    for (let h = 9; h <= 20; h++) {
      for (const m of [0, 30]) {
        if (h === 20 && m > 0) continue;

        const time = `${this.pad(h)}:${this.pad(m)}`;

        if (isToday) {
          const candidate = new Date();
          candidate.setHours(h, m, 0, 0);

          if (candidate <= now) continue;
        }

        hours.push(time);
      }
    }

    this.availableHours = hours;
  }
  submitReprogram() {
    const { reservationId, date, hour } = this.reprogramData;

    if (!reservationId || !date || !hour) return;

    const payload = {
      reservedAt: date,
      hourAt: hour,
    };

    console.log('📤 Reprogramando:', reservationId, payload);

    this.reservationsService
      .updateReservationDate(reservationId, {
        reservedAt: date,
        hourAt: hour,
      })
      .subscribe({
        next: () => {
          this.onChangeStatusFromCalendar(this.reprogramData, 6); // Cambia estado a Reprogramada
          this.closeReprogramModal();
        },
        error: (err) => {
          this.openErrorModal(err, 'No se pudo reprogramar la reservación.');
        },
      });

    
  }
  formatDateInput(date: Date): string {
    const y = date.getFullYear();
    const m = this.pad(date.getMonth() + 1);
    const d = this.pad(date.getDate());
    return `${y}-${m}-${d}`;
  }

  pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
  }
  closeReprogramModal() {
    this.showReprogramModal = false;
    this.reprogramData = {
      reservationId: null,
      date: '',
      hour: '',
      id: '',
    };
    this.availableHours = [];
  }

  openCreateReservationModal(date?: Date) {
    this.showCreateModal = true;

    const selectedDate = date
      ? this.formatDateInput(date)
      : this.formatDateInput(new Date());

    this.createReservationData = {
      customerId: null,
      serviceId: null,
      specialistId: null,
      requiresPersonalAdvice: false,
      hourAt: '',
      reservedAt: selectedDate,
    };
    this.filteredSpecialists = [];
    // 🔥 generar horas disponibles
    this.generateAvailableHours(selectedDate);
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  createReservation() {
    const selectedServiceId = this.toPositiveNumberOrNull(
      this.createReservationData.serviceId
    );

    const body = {
      customerId: this.createReservationData.customerId,
      serviceId: selectedServiceId,
      ServiceId: selectedServiceId,
      productId: selectedServiceId,
      ProductId: selectedServiceId,
      specialistId: this.createReservationData.specialistId,
      requiresPersonalAdvice:
        this.createReservationData.requiresPersonalAdvice,
      hourAt: this.createReservationData.hourAt
      ,
      reservedAt: this.createReservationData.reservedAt,
    };

    const fingerprint = this.buildReservationFingerprint(body);

    console.log('[CalendarReservations] createReservation payload:', body);

    if (selectedServiceId !== null) {
      this.saveServiceSelectionCache(
        selectedServiceId,
        null,
        fingerprint
      );
    }

    this.reservationsService.createReservation(body).subscribe({
      next: (response: any) => {
        console.log('[CalendarReservations] createReservation OK', response);

        const createdReservationId = this.toNumberOrNull(
          response?.id
        );

        if (
          selectedServiceId !== null &&
          createdReservationId !== null
        ) {
          this.saveServiceSelectionCache(
            selectedServiceId,
            createdReservationId,
            fingerprint
          );
        }

        this.closeCreateModal();
        this.startReservationRegistrationFlow(
          createdReservationId,
          fingerprint
        );
      },
      error: (err) => {
        console.error('[CalendarReservations] createReservation ERROR', err);
      },
    });
  }

  private startReservationRegistrationFlow(
    createdReservationId: number | null,
    fingerprint: string
  ) {
    this.processingOverlay.show('Se esta registrando tu reservacion...');
    this.pollReservationUntilVisible(
      createdReservationId,
      fingerprint,
      0
    );
  }

  private pollReservationUntilVisible(
    createdReservationId: number | null,
    fingerprint: string,
    attempt: number
  ) {
    this.reservationsService.getReservations().subscribe({
      next: (reservations) => {
        this.rawReservations = reservations ?? [];
        this.mapReservationsAndEvents();

        const found = this.rawReservations.some((reservation) => {
          const reservationId = this.toNumberOrNull(reservation?.id);

          if (
            createdReservationId !== null &&
            reservationId === createdReservationId
          ) {
            return true;
          }

          return (
            fingerprint.length > 0 &&
            this.buildReservationFingerprint(reservation) === fingerprint
          );
        });

        if (found) {
          this.clearReservationSyncTimer();
          this.processingOverlay.hide();
          return;
        }

        if (attempt >= this.reservationSyncMaxAttempts - 1) {
          this.clearReservationSyncTimer();
          this.processingOverlay.hide();
          this.loadReservations();
          return;
        }

        this.clearReservationSyncTimer();
        this.reservationSyncTimer = setTimeout(() => {
          this.pollReservationUntilVisible(
            createdReservationId,
            fingerprint,
            attempt + 1
          );
        }, this.reservationSyncDelayMs);
      },
      error: () => {
        if (attempt >= this.reservationSyncMaxAttempts - 1) {
          this.clearReservationSyncTimer();
          this.processingOverlay.hide();
          this.loadReservations();
          return;
        }

        this.clearReservationSyncTimer();
        this.reservationSyncTimer = setTimeout(() => {
          this.pollReservationUntilVisible(
            createdReservationId,
            fingerprint,
            attempt + 1
          );
        }, this.reservationSyncDelayMs);
      },
    });
  }

  private clearReservationSyncTimer() {
    if (this.reservationSyncTimer !== null) {
      clearTimeout(this.reservationSyncTimer);
      this.reservationSyncTimer = null;
    }
  }

  onServiceChange() {
    const selectedServiceId = this.toPositiveNumberOrNull(
      this.createReservationData.serviceId
    );

    const service = this.services.find(
      (item) =>
        this.toPositiveNumberOrNull(item?.id) ===
        selectedServiceId
    );

    this.filteredSpecialists = service?.stylists ?? [];
    this.createReservationData.specialistId = null;
  }
}