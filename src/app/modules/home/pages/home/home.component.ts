import { Component } from '@angular/core';
import { ApiService } from 'src/app/core/services/api.service';

import * as bootstrap from 'bootstrap';
import { Router } from '@angular/router';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  userInput: string = '';
  searchTerm: string = '';
  todayWeekday!: number;
  hasSlots = false;
  hasSlotsRep = false;
  loading = false;
  customer = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryId: 1,
  };
  reservationToReprogram: number | null = null;
  newReservationDate: any = null;
  newReservationHour: string = '';
  selectedStatusId: number | null = null;
  selectedSlot: string | null = null;
  reservations: any[] = []; // todas las reservas
  filteredReservations: any[] = []; // reservas filtradas
  morningSlots: string[] = [];
  afternoonSlots: string[] = [];
  eveningSlots: string[] = [];
  morningSlotsRep: string[] = [];
  afternoonSlotsRep: string[] = [];
  eveningSlotsRep: string[] = [];
  customers: any[] = [];
  validDates: string[] = [];
  weekDays: any[] = [];
  reservationsCountByDate: { date: string; count: number }[] = [];
  dataChartReservationsByDate: any;
  reservationsCountByMonth: { month: string; count: number }[] = [];
  dataChartReservationsByMonth: any;
  reservationsCountBySpecialist: { specialistName: string; count: number }[] = [];
  dataChartReservationsBySpecialist: any;
  hours: any;
  specialists: any[] = localStorage.getItem('specialists')
    ? JSON.parse(localStorage.getItem('specialists') || '[]')
    : [];
  reservationStatuses: any[] = localStorage.getItem('reservationStatuses')
    ? JSON.parse(localStorage.getItem('reservationStatuses') || '[]')
    : [];
  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true, // empieza desde 0
        ticks: {
          stepSize: 1, // incrementos de 1 en 1
          precision: 0, // sin decimales
        },
        grid: {
          color: '#eee',
        },
      },
      x: {
        grid: {
          color: '#f9f9f9',
        },
      },
    },
    plugins: {
      legend: { display: true },
    },
  };

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false, // opcional, útil si usas un contenedor flexible
    scales: {
      y: {
        beginAtZero: true, // empieza desde 0
        ticks: {
          stepSize: 1, // incrementos de 1 en 1
          precision: 0, // sin decimales
        },
        grid: {
          color: '#eee',
        },
      },
      x: {
        grid: {
          color: '#f9f9f9',
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          boxWidth: 15,
          color: '#555',
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#333',
        titleColor: '#fff',
        bodyColor: '#fff',
      },
    },
    animation: {
      duration: 800,
      easing: 'easeOutQuart',
    },
  };

  constructor(private ApiService: ApiService, private router: Router) {
    this.weekDays = this.getNext7Days();
    console.log(this.weekDays);
    const today = new Date();
    this.todayWeekday = today.getDay() === 0 ? 7 : today.getDay();
    this.loading = true;
    this.refreshCustomers();
    this.businessHours(this.todayWeekday);
    if (this.specialists.length === 0) {
      this.refreshSpecialists();
    }
    if (this.reservationStatuses.length === 0) {
      this.getStatusReservations();
    }
    this.refreshReservations();
  }
  getStatusReservations() {
    this.ApiService.getStatusReservations().subscribe({
      next: (data) => {
        this.reservationStatuses = data;
        localStorage.setItem('reservationStatuses', JSON.stringify(data));
        console.log('Status Reservations:', data);
      },
      error: (err) => {
        console.error('❌ Error fetching status reservations', err);
      },
    });
  }
  refreshSpecialists() {
    this.ApiService.getSpecialists().subscribe({
      next: (data) => {
        localStorage.setItem('specialists', JSON.stringify(data));
        this.specialists = data;
      },
    });
  }

  searchSpecialist(id: number) {
    const specialist = this.specialists.find((s: any) => s.id === id);
    return specialist ? `${specialist.firstName} ${specialist.lastName}` : '';
  }

  searchCustomer(id: number) {
    const customer = this.customers.find((c: any) => c.id === id);
    return customer ? `${customer.firstName} ${customer.lastName}` : '';
  }

  refreshCustomers() {
    this.ApiService.getCustomers().subscribe({
      next: (data) => {
        this.loading = false;
        this.customers = data;
      },
    });
  }

  refreshReservations() {
    this.ApiService.getReservations().subscribe({
      next: (data) => {
        this.reservations = data;
        this.filteredReservations = data; // por defecto todas
        this.loading = false;
        this.validDates = data.map(
          (r: any) => new Date(r.reservedAt).toISOString().split('T')[0]
        );
        this.generateDataChart();
      },
    });
  }

  businessHours(day: number) {
    this.ApiService.getBusinessHours(day).subscribe({
      next: (data) => {
        if (data.weekday === this.todayWeekday) {
          this.filterSlots(data, 1);
        } else {
          this.hasSlots = false;
        }
      },
      error: (err) => {},
    });
  }

  filterSlots(data: any, option: number) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const nowInMinutes = currentHour * 60 + currentMinute;

    const toMinutes = (time: string): number => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    if (option === 1) {
      this.morningSlots = data.morningSlots.filter(
        (slot: string) => toMinutes(slot) > nowInMinutes
      );

      this.afternoonSlots = data.afternoonSlots.filter(
        (slot: string) => toMinutes(slot) > nowInMinutes
      );

      this.eveningSlots = data.eveningSlots.filter(
        (slot: string) => toMinutes(slot) > nowInMinutes
      );
    } else if (option === 2) {
      this.morningSlotsRep = data.morningSlots.filter(
        (slot: string) => toMinutes(slot) > nowInMinutes
      );

      this.afternoonSlotsRep = data.afternoonSlots.filter(
        (slot: string) => toMinutes(slot) > nowInMinutes
      );

      this.eveningSlotsRep = data.eveningSlots.filter(
        (slot: string) => toMinutes(slot) > nowInMinutes
      );
    }

    // 🔹 si no hay nada en ninguna lista, marco que no hay slots
    this.hasSlots =
      this.morningSlots.length > 0 ||
      this.afternoonSlots.length > 0 ||
      this.eveningSlots.length > 0;

    console.log('Disponibles:', {
      morning: this.morningSlots,
      afternoon: this.afternoonSlots,
      evening: this.eveningSlots,
    });
  }

  registerClient() {
    this.loading = true;
    this.ApiService.postRegisterClient(this.customer).subscribe({
      next: (res) => {
        this.openModal();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al registrar cliente:', err);
        alert('Error al registrar cliente ❌');
        this.loading = false;
      },
    });
  }

  submitInput() {
    this.loading = true;
    const verification = { code: this.userInput, email: this.customer.email };
    this.ApiService.postverifyClient(verification).subscribe({
      next: (res) => {
        this.refreshCustomers();
        this.closeModal();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al verificar cliente:', err);
        alert('Error al verificar cliente ❌');
        this.loading = false;
      },
    });
  }

  filteredCustomers() {
    const term = this.searchTerm.toLowerCase();
    return this.customers.filter(
      (c) =>
        c.firstName.toLowerCase().includes(term) ||
        c.lastName.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term)
    );
  }

  openModal() {
    const modalElement = document.getElementById('successModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  closeModal() {
    const modalEl = document.getElementById('successModal');
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      modal?.hide();
    }
  }

  agendarCitaPaciente(customersId: number) {
    this.router.navigate(['/home/reservar-cita-cliente'], {
      queryParams: { customersId },
    });
  }
  filterByStatus(statusId: number) {
    this.selectedStatusId = statusId;
    this.filteredReservations = this.reservations.filter(
      (r: any) => r.statusId === statusId
    );
  }

  clearFilter() {
    this.selectedStatusId = null;
    this.filteredReservations = this.reservations; // reset
  }
  newStatusReservation(idReservation: number, newStatusId: number) {
    this.loading = true;
    const data = { newStatusId: newStatusId };
    this.ApiService.patchReservationStatus(idReservation, data).subscribe({
      next: (data) => {
        console.log('Status updated:', data);
        this.refreshReservations();
      },
      error: (err) => {
        this.loading = false;
        console.error('❌ Error updating status', err);
      },
    });
  }

  FilterToday(): void {
    const today = new Date().toISOString().split('T')[0]; // yyyy-mm-dd
    this.filteredReservations = this.reservations.filter((r: any) => {
      const reservedDate = new Date(r.reservedAt).toISOString().split('T')[0];
      return reservedDate === today;
    });
  }
  dateFilter = (d: Date | null): boolean => {
    if (!d) return false;
    const dateStr = d.toISOString().split('T')[0];
    return this.validDates.includes(dateStr);
  };

  // filtrar al elegir una fecha
  filterByDate(selectedDate: Date | null): void {
    if (!selectedDate) {
      this.filteredReservations = this.reservations; // reset
      return;
    }
    const selectedStr = selectedDate.toISOString().split('T')[0];
    this.filteredReservations = this.reservations.filter(
      (r) => new Date(r.reservedAt).toISOString().split('T')[0] === selectedStr
    );
  }
  reprogramReservation(idReservation: number) {
    this.reservationToReprogram = idReservation;
    this.newReservationDate = '';
    const modalEl = document.getElementById('reprogramModal');
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  confirmReprogramReservation() {
    if (this.reservationToReprogram != null) {
      // Aquí llamas a tu API o función para reprogramar
      this.loading = true;
      const updatedReservation = {
        reservedAt: this.newReservationDate.fecha,
        hourAt: this.newReservationHour,
      };

      this.ApiService.putNewReservation(
        this.reservationToReprogram,
        updatedReservation
      ).subscribe({
        next: (data) => {
          const modalEl = document.getElementById('reprogramModal');
          if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal?.hide();
          }
          this.newStatusReservation(this.reservationToReprogram!, 6);
        },
        error: (err) => {
          this.loading = false;
          console.error('❌ Error reprogramando reserva', err);
        },
      });
      // cerrar modal
    }
  }

  getNext7Days(): {
    fecha: string;
    day: string;
    semana: string;
    weekday: number;
  }[] {
    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const result: {
      fecha: string;
      day: string;
      semana: string;
      weekday: number;
    }[] = [];

    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const dayNum = String(date.getDate()).padStart(2, '0');

      // ✅ getDay() ya devuelve: Dom=0 ... Sáb=6
      const weekday = date.getDay();

      result.push({
        fecha: `${year}-${month}-${dayNum}`,
        day: `${dayNum}-${month}`,
        semana: daysOfWeek[weekday],
        weekday: weekday,
      });
    }
    return result;
  }

  selectDate(date: any) {
    this.newReservationDate = date;
    this.loading = true;
    this.newReservationHour = '';
    this.ApiService.getBusinessHours(date.weekday).subscribe({
      next: (data) => {
        this.loading = false;
        console.log('Data recibida:', data);

        const today = new Date();
        const todayStr = today.toLocaleDateString('en-CA');

        if (date.fecha === todayStr) {
          // si selecciona HOY → filtramos slots
          this.filterSlots(data, 2);
        } else {
          // si selecciona otro día → usamos los slots completos
          this.morningSlotsRep = data.morningSlots || [];
          this.afternoonSlotsRep = data.afternoonSlots || [];
          this.eveningSlotsRep = data.eveningSlots || [];
          this.hasSlotsRep =
            this.morningSlotsRep.length > 0 ||
            this.afternoonSlotsRep.length > 0 ||
            this.eveningSlotsRep.length > 0;
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error fetching business hours:', error);
      },
    });
  }
  selectTime(slot: string) {
    this.newReservationHour = slot;
  }

  onReprogramModalClosed() {
    console.log('El modal de reprogramación se cerró');
    // Aquí puedes resetear variables, limpiar inputs, etc.
    this.newReservationDate = '';
    this.newReservationHour = '';
    this.afternoonSlotsRep = [];
    this.morningSlotsRep = [];
    this.eveningSlotsRep = [];
    this.hasSlotsRep = false;
    this.reservationToReprogram = null;
  }
  getStatusName(statusId: number): string {
    const status = this.reservationStatuses.find((s) => s.id === statusId);
    return status ? status.name : 'Desconocido';
  }

  openSlotModal(slot: string) {
    this.selectedSlot = slot;
    const modalEl = document.getElementById('slotModal');
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  confirmSlot() {
    console.log('✅ Horario confirmado:', this.selectedSlot);
    const modalEl = document.getElementById('slotModal');
    const modal = bootstrap.Modal.getInstance(modalEl!);
    modal?.hide();
  }

  generateDataChart() {
    console.log('reservations =>', this.reservations);
    this.reservationsCountByDate = this.getReservationsCountByDate(
      this.reservations
    );
    this.reservationsCountByMonth = this.getReservationsCountByMonth(
      this.reservations
    );

    this.reservationsCountBySpecialist = this.getReservationsCountBySpecialist(
      this.reservations, this.specialists
    );
    this.dataChartReservationsByDate = {
      labels: this.reservationsCountByDate.map((item) => item.date),
      datasets: [
        {
          label: 'Citas registradas',
          data: this.reservationsCountByDate.map((item) => item.count),
          fill: false,
          borderColor: '#42A5F5', // línea
          backgroundColor: 'rgba(66,165,245,0.2)', // fondo bajo la línea
          pointBackgroundColor: '#1565C0', // color de los puntos
          pointBorderColor: '#FFFFFF', // borde de los puntos
          pointRadius: 6, // tamaño del punto
          pointHoverRadius: 8, // tamaño al pasar el mouse
          tension: 0.1,
        },
      ],
    };
    this.dataChartReservationsByMonth = {
      labels: this.reservationsCountByMonth.map((item) => item.month),
      datasets: [
        {
          label: 'Citas registradas',
          data: this.reservationsCountByMonth.map((item) => item.count),
          fill: false,
        },
      ],
    };

    this.dataChartReservationsBySpecialist = {
      labels: this.reservationsCountBySpecialist.map((item) => item.specialistName),
      datasets: [
        { 
          label: 'Citas registradas',
          data: this.reservationsCountBySpecialist.map((item) => item.count),
          backgroundColor: 'rgba(75, 192, 192, 0.6)', // Color de las barras
          borderColor: 'rgba(75, 192, 192, 1)', // Color del borde de las barras
          borderWidth: 1 // Ancho del borde de las barras
          
        }]

    }
    console.log('data =>', this.reservationsCountBySpecialist);
  }

  getReservationsCountByDate(reservations: any[]) {
    const counts: Record<string, number> = {};

    reservations.forEach((r) => {
      const date = r.reservedAt.split('T')[0]; // Extrae solo la parte de la fecha
      counts[date] = (counts[date] || 0) + 1;
    });

    // Devuelve un arreglo ordenado por fecha (ideal para graficar)
    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  getReservationsCountByMonth(reservations: any[]) {
    const counts: Record<string, number> = {};
    const currentYear = new Date().getFullYear();

    const monthNames = [
      'ene',
      'feb',
      'mar',
      'abr',
      'may',
      'jun',
      'jul',
      'ago',
      'sep',
      'oct',
      'nov',
      'dic',
    ];

    reservations.forEach((r) => {
      const dateStr = r.reservedAt || r.fecha || r.date;
      if (!dateStr) return;

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return;

      const year = date.getFullYear();
      const monthIndex = date.getMonth(); // 0 = enero, 8 = septiembre

      if (year === currentYear) {
        const month = monthNames[monthIndex];
        counts[month] = (counts[month] || 0) + 1;
      }
    });

    // Devolver en orden fijo (ene → dic)
    return monthNames
      .filter((m) => counts[m])
      .map((m) => ({ month: m, count: counts[m] }));
  }

  getReservationsCountBySpecialist(reservations: any[], specialists: any[]) {
  const counts: Record<number, number> = {};

  // Contar cuántas reservas tiene cada specialistId
  reservations.forEach((r) => {
    counts[r.specialistId] = (counts[r.specialistId] || 0) + 1;
  });

  // Combinar con los nombres de los especialistas
  return Object.entries(counts).map(([id, count]) => {
    const specialist = specialists.find((s) => s.id === Number(id));
    return {
      specialistName: specialist
        ? `${specialist.firstName} ${specialist.lastName}`
        : `ID ${id}`,
      count,
    };
  });
}

}
