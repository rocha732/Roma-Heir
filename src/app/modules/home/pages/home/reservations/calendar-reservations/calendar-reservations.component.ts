import { Component, OnInit } from '@angular/core';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { Subject } from 'rxjs';
import { ReservationsService } from 'src/app/core/services/reservations.service';
import {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from 'date-fns';
import { addMinutes } from 'date-fns';

import { isSameDay } from 'date-fns';
import { GetReservations } from 'src/app/core/models/reservations';
import { UsersService } from 'src/app/core/services/users.service';
import { ResponseUsers } from 'src/app/core/models/users';
import { es } from 'date-fns/locale';

@Component({
  selector: 'app-calendar-reservations',
  templateUrl: './calendar-reservations.component.html',
  styleUrls: ['./calendar-reservations.component.scss'],
})
export class CalendarReservationsComponent implements OnInit {
  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView;
  DEFAULT_DURATION_MINUTES = 30;
  loading = true;
  selectedStatusId: number | null = null;

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

  constructor(
    private reservationsService: ReservationsService,
    private usersService: UsersService
  ) {}

  ngOnInit(): void {
    this.loadSpecialists();
    this.loadReservations();
    this.loading = true;
  }

  loadReservations() {
    this.reservationsService.getReservations().subscribe({
      next: (reservations) => {
        this.rawReservations = reservations;
        // 👇 cuando usuarios estén listos, ahí se arma TODO
        this.loadUsers();
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onEventClicked(event: CalendarEvent) {
    const r = event.meta;

    console.log('Cliente:', r.customerName);
    console.log('Especialista:', r.specialistName);
    console.log('Hora:', r.hourAt);
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
  loadUsers() {
    this.usersService.getUsers().subscribe((users) => {
      users.forEach((u) => {
        this.usersMap.set(u.id, {
          name: `${u.firstName} ${u.lastName}`,
          email: u.email,
          phone: u.phone,
        });
      });

      // 🔥 aquí ya tengo TODO
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
        };
      });

    this.allReservations = [...this.reservations];

    // 2️⃣ Construyo eventos del calendario con META CORRECTA
    this.events = this.reservations.map((r) => {
      const start = this.buildDate(r.reservedAt, r.hourAt);
      const end = this.buildEndDate(start);

      const color = this.statusColors[r.statusId] ?? {
        primary: '#343a40',
        secondary: '#f8f9fa',
      };

      return {
        start,
        end,
        title: `${r.customerName} • ${r.hourAt}`,
        color,
        meta: {
          ...r,
          start,
          end,
        },
      };
    });
    this.loading = false;
    this.refresh.next();
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

    const filtered = statusId
      ? this.allReservations.filter((r) => r.statusId === statusId)
      : this.allReservations;

    this.events = filtered.map((r) => {
      const start = this.buildDate(r.reservedAt, r.hourAt);
      const end = this.buildEndDate(start);

      return {
        start,
        end,
        title: `${r.customerName} • ${r.hourAt}`,
        color: this.statusColors[r.statusId],
        meta: r,
      };
    });

    this.selectedDayEvents = [];
    this.refresh.next();
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
        error: (err) => console.error(err),
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

  onReprogramDateChange() {
    this.reprogramData.hour = '';
    this.generateAvailableHours(this.reprogramData.date!);
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
        hourAt: hour + ':00',
      })
      .subscribe({
        next: () => {
          this.onChangeStatusFromCalendar(this.reprogramData, 6); // Cambia estado a Reprogramada
          this.closeReprogramModal();
        },
        error: (err) => console.error(err),
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
}
