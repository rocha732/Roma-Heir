import { Component } from '@angular/core';
import { ApiService } from 'src/app/core/services/api.service';

import * as bootstrap from 'bootstrap';
import { Router } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  userInput: string = '';
  searchTerm: string = '';
  searchTerm2: string = '';
  todayWeekday!: number;
  hasSlots = false;
  hasSlotsRep = false;
  loading = false;
  showError = false;
  showError2 = false;
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
  orders: any[] = [];
  orderDetails: any;
  products: any[] = [];
  selectedCustomer: any = null;
  searchTermSpecialist = '';
  selectedSpecialist: any = null;
  validDates: string[] = [];
  weekDays: any[] = [];
  reservationsCountByDate: { date: string; count: number }[] = [];
  dataChartReservationsByDate: any;
  reservationsCountByMonth: { month: string; count: number }[] = [];
  dataChartReservationsByMonth: any;
  reservationsCountBySpecialist: { specialistName: string; count: number }[] =
    [];
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
    this.refreshProducts();
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
        console.log('Customers =>', this.customers);
      },
    });
  }

  refreshReservations() {
    this.ApiService.getReservations().subscribe({
      next: (data) => {
        this.reservations = data;
        this.filteredReservations = data; // por defecto todas
        this.refreshgetOrders();
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
    this.selectedCustomer = null;
    this.selectedSpecialist = null;
    this.showError = false;
    this.searchTerm2 = '';
    this.searchTermSpecialist = '';
    const modalEl = document.getElementById('slotModal');
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  confirmSlot() {
    this.loading = true;
    const newReservation = {
      customerId: this.selectedCustomer.id,
      specialistId: this.selectedSpecialist.id,
      hourAt: this.selectedSlot,
      reservedAt: new Date().toISOString().split('T')[0], // hoy
      requiresPersonalAdvice: true, // pendiente
    };
    const modalEl = document.getElementById('slotModal');
    const modal = bootstrap.Modal.getInstance(modalEl!);
    this.ApiService.postReservation(newReservation).subscribe({
      next: (data) => {
        modal?.hide();
        this.resetSearch();
        this.refreshReservations();
      },
      error: (err) => {
        modal?.hide();
        this.resetSearch();
      },
    });

    console.log('✅ Horario confirmado:', this.selectedSlot);
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
      this.reservations,
      this.specialists
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
      labels: this.reservationsCountBySpecialist.map(
        (item) => item.specialistName
      ),
      datasets: [
        {
          label: 'Citas registradas',
          data: this.reservationsCountBySpecialist.map((item) => item.count),
          backgroundColor: 'rgba(75, 192, 192, 0.6)', // Color de las barras
          borderColor: 'rgba(75, 192, 192, 1)', // Color del borde de las barras
          borderWidth: 1, // Ancho del borde de las barras
        },
      ],
    };
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

  filteredCustomer() {
    const term = this.searchTerm2.toLowerCase();

    // Obtener fecha actual en formato YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];

    // Filtrar por coincidencia de búsqueda
    let filtered = this.customers.filter(
      (c) =>
        c.firstName.toLowerCase().includes(term) ||
        c.lastName.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term)
    );

    // IDs de clientes que tienen reserva HOY y a la misma hora
    const reservedIds = this.reservations
      .filter(
        (r) =>
          r.hourAt.startsWith(this.selectedSlot) &&
          r.reservedAt.startsWith(todayStr)
      )
      .map((r) => r.customerId);

    // Excluirlos de la lista
    filtered = filtered.filter((c) => !reservedIds.includes(c.id));

    return filtered;
  }

  selectCustomer(user: any) {
    this.selectedCustomer = user;
    this.showError = true;

    console.log('Usuario seleccionado:', this.selectedCustomer);
  }

  resetSearch() {
    // Al hacer click en el input, se borra el usuario seleccionado
    this.selectedCustomer = null;
    this.searchTerm = '';
    this.showError = false;
    this.showError2 = false;
    this.searchTerm2 = '';
  }

  resetSearchSpecialist() {
    console.log('focus en input especialista');
    this.selectedSpecialist = null;
    this.searchTermSpecialist = '';
    this.showError = false;
    this.showError2 = false;
    this.searchTerm2 = '';
  }
  validateCustomer() {
    this.showError = true;
    this.showError2 = false;
    // Validar que true un cliente seleccionado
    if (!this.selectedCustomer) {
      console.warn('Debes seleccionar un cliente');
      return false;
    }

    // Validar que haya un especialista seleccionado
    if (!this.selectedSpecialist) {
      console.warn('Debes seleccionar un especialista');
      return false;
    }

    // Si ambas validaciones pasan → confirmar la cita
    this.confirmSlot();

    // Opcional: ocultar el error luego de confirmar correctamente
    this.showError = false;
    return true;
  }

  filteredSpecialist() {
    const term = this.searchTermSpecialist.toLowerCase();

    // Obtener fecha actual en formato YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];

    // Filtrar por coincidencia de búsqueda
    let filtered = this.specialists.filter(
      (s) =>
        s.firstName.toLowerCase().includes(term) ||
        s.lastName.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term)
    );

    // IDs de especialistas que tienen reserva HOY y a la misma hora
    const reservedIds = this.reservations
      .filter(
        (r) =>
          r.hourAt.startsWith(this.selectedSlot) &&
          r.reservedAt.startsWith(todayStr)
      )
      .map((r) => r.specialistId);

    // Excluir los especialistas reservados, excepto si su ID es 999
    filtered = filtered.filter(
      (s) => !reservedIds.includes(s.id) || s.id === 999
    );

    return filtered;
  }

  selectSpecialist(specialist: any) {
    console.log('Seleccionado:', specialist);
    this.showError = true;
    this.selectedSpecialist = specialist;
    this.searchTermSpecialist = `${specialist.firstName} ${specialist.lastName}`;
  }

  refreshgetOrders() {
    this.ApiService.getOrders().subscribe({
      next: (data) => {
        this.loading = false;
        this.orders = data;
        console.log('Orders =>', this.orders);
      },
    });
  }

  showOrderInfo(order: any) {
    this.loading = true;
    this.ApiService.getOrderDetails(order.id).subscribe({
      next: (data) => {
        // 🔍 Enriquecer cada ítem con los datos del producto
        if (data?.items?.length) {
          data.items = data.items.map((item: any) => {
            const productInfo = this.products.find(
              (p) => p.id === item.productId
            );
            return {
              ...item,
              product: productInfo
                ? {
                    name: productInfo.name,
                    description: productInfo.description,
                    category: productInfo.categoryName,
                    image: productInfo.profileImageUrl,
                    price: productInfo.price,
                  }
                : null,
            };
          });
        }

        this.orderDetails = data;
        this.loading = false;
        console.log('📦 Detalles del pedido enriquecidos:', data);

        // 📦 Mostrar modal después de cargar datos
        const modalElement = document.getElementById('orderDetailsModal');
        if (modalElement) {
          const modal = new bootstrap.Modal(modalElement);
          modal.show();
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('❌ Error fetching order details', err);
      },
    });
  }

  async printPaidOrderPDF() {
    if (!this.orderDetails) return;

    const order = this.orderDetails;
    const doc = new jsPDF();

    // Cargar logo
    // Cargar logo PNG
    const logo = await fetch('assets/ico-logo.png')
      .then((res) => res.blob())
      .then((blob) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      });
    // Agregar esto justo antes de insertar el logo
    const logoX = 14;
    const logoY = 8;
    const logoWidth = 20;
    const logoHeight = 20;

    // Dibujar fondo negro detrás del logo
    doc.setFillColor(0, 0, 0); // negro
    doc.rect(logoX, logoY, logoWidth, logoHeight, 'F'); // 'F' = fill
    // Insertar logo
    doc.addImage(logo, 'PNG', 14, 8, 20, 20);

    // Encabezado
    doc.setFontSize(16);
    doc.text('ROMA HAIR - Boleta de Pago', 40, 20);
    doc.setFontSize(11);
    doc.text(`Pedido #${order.id}`, 14, 35);
    doc.text(`Fecha: ${new Date(order.createdAt).toLocaleString()}`, 14, 42);

    // Cliente
    doc.text('Cliente:', 14, 52);
    doc.text(order.customer.fullName, 35, 52);
    doc.text('Email:', 14, 59);
    doc.text(order.customer.email, 35, 59);
    doc.text('Teléfono:', 14, 66);
    doc.text(order.customer.phone, 35, 66);

    doc.line(14, 70, 195, 70);
    doc.setFontSize(12);
    doc.text('Detalles del Pedido', 14, 78);

    // Tabla
    const tableBody = order.items.map((i: any) => {
      const product = this.products.find((p) => p.id === i.productId);
      return [
        product?.name || `Producto #${i.productId}`,
        product?.categoryName || '-',
        i.quantity,
        i.price.toFixed(2),
        i.subtotal.toFixed(2),
      ];
    });

    autoTable(doc, {
      startY: 82,
      head: [
        ['Producto', 'Categoría', 'Cantidad', 'Precio (S/)', 'Subtotal (S/)'],
      ],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [46, 47, 55], textColor: [255, 255, 255] }, // #2e2f37
      styles: { fontSize: 10, cellPadding: 2 },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(11);
    doc.text(`Total ítems: ${order.totalItems}`, 14, finalY + 10);
    doc.text(
      `Total pagado: S/ ${order.totalAmount.toFixed(2)}`,
      14,
      finalY + 16
    );
    doc.text(`Método de entrega: ${order.deliveryMethod}`, 14, finalY + 22);
    doc.text(`Estado: ${order.orderStatus}`, 14, finalY + 28);
    doc.text(`Pagado: Sí`, 14, finalY + 34);

    if (order.paymentDate) {
      doc.text(
        `Fecha de pago: ${new Date(order.paymentDate).toLocaleString()}`,
        14,
        finalY + 40
      );
    }

    doc.setTextColor(46, 47, 55);
    doc.setFontSize(13);
    doc.text('PAGO CONFIRMADO', 14, finalY + 55);

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  }
  async printPendingOrderPDF() {
    if (!this.orderDetails) return;

    const order = this.orderDetails;
    const doc = new jsPDF();
    // Agregar esto justo antes de insertar el logo
    const logoX = 14;
    const logoY = 8;
    const logoWidth = 20;
    const logoHeight = 20;

    // Dibujar fondo negro detrás del logo
    doc.setFillColor(0, 0, 0); // negro
    doc.rect(logoX, logoY, logoWidth, logoHeight, 'F'); // 'F' = fill
    // Cargar logo PNG
    const logo = await fetch('assets/ico-logo.png')
      .then((res) => res.blob())
      .then((blob) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      });

    // Insertar logo
    doc.addImage(logo, 'PNG', 14, 8, 20, 20);

    // Encabezado
    doc.setFontSize(16);
    doc.text('ROMA HAIR - Orden Pendiente de Pago', 40, 20);
    doc.setFontSize(11);
    doc.text(`Pedido #${order.id}`, 14, 35);
    doc.text(`Fecha: ${new Date(order.createdAt).toLocaleString()}`, 14, 42);

    // Cliente
    doc.text('Cliente:', 14, 52);
    doc.text(order.customer.fullName, 35, 52);
    doc.text('Email:', 14, 59);
    doc.text(order.customer.email, 35, 59);
    doc.text('Teléfono:', 14, 66);
    doc.text(order.customer.phone, 35, 66);

    doc.line(14, 70, 195, 70);
    doc.setFontSize(12);
    doc.text('Detalles del Pedido', 14, 78);

    // Tabla
    const tableBody = order.items.map((i: any) => {
      const product = this.products.find((p) => p.id === i.productId);
      return [
        product?.name || `Producto #${i.productId}`,
        product?.categoryName || '-',
        i.quantity,
        i.price.toFixed(2),
        i.subtotal.toFixed(2),
      ];
    });

    autoTable(doc, {
      startY: 82,
      head: [
        ['Producto', 'Categoría', 'Cantidad', 'Precio (S/)', 'Subtotal (S/)'],
      ],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [46, 47, 55], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 2 },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(11);
    doc.text(`Total ítems: ${order.totalItems}`, 14, finalY + 10);
    doc.text(
      `Total a pagar: S/ ${order.totalAmount.toFixed(2)}`,
      14,
      finalY + 16
    );
    doc.text(`Método de entrega: ${order.deliveryMethod}`, 14, finalY + 22);
    doc.text(`Estado: ${order.orderStatus}`, 14, finalY + 28);
    doc.text(`Pagado: No`, 14, finalY + 34);

    doc.setTextColor(255, 0, 0);
    doc.setFontSize(13);
    doc.text('PAGO PENDIENTE', 14, finalY + 50);

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  }

  refreshProducts() {
    this.ApiService.getProducts().subscribe({
      next: (data) => {
        this.products = data;
        console.log('Productos =>', this.products);
      },
    });
  }
  selectedImage: string | null = null;

  openImage(imageUrl: string | undefined) {
    if (imageUrl) {
      this.selectedImage = imageUrl;
    }
  }

  closeImage() {
    this.selectedImage = null;
  }

  payOrder(orderId: number) {
    this.loading = true;
    const modalElement = document.getElementById('orderDetailsModal');
    this.ApiService.putOrderPayment(orderId).subscribe({
      next: (response) => {
        this.loading = false;
        modalElement && bootstrap.Modal.getInstance(modalElement)?.hide();
        this.refreshgetOrders();
        console.log('Pago confirmado:', response);
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al confirmar pago:', error);
      },
    });
  }

  async generateCombinedPDF() {
    if (!this.filteredReservations || this.filteredReservations.length === 0)
      return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 14;
    const marginRight = 14;
    const marginTop = 20;
    const rowHeight = 12;
    const blockMinutes = 30;
    const colWidthMin = 30;
    const lineHeight = 8;

    const reservationsByDate = this.groupBy(this.filteredReservations, (res) =>
      res.reservedAt.slice(0, 10)
    );

    const statusMap: Record<number, string> = {
      1: 'Pendiente',
      2: 'Confirmado',
      3: 'Cancelado',
      4: 'Otro',
      5: 'Especial',
      6: 'Otro2',
    };

    for (const date in reservationsByDate) {
      const reservations = reservationsByDate[date];

      // Separar reservas de specialistId 999 y los demás
      const expressReservations = reservations.filter(
        (r) => r.specialistId === 999
      );
      const normalReservations = reservations.filter(
        (r) => r.specialistId !== 999
      );

      // 1️⃣ CALENDARIO para especialistas normales
      if (normalReservations.length > 0) {
        const reservationsBySpecialist = this.groupBy(
          normalReservations,
          (res) => this.searchSpecialist(res.specialistId)
        );
        const specialists = Object.keys(reservationsBySpecialist);

        doc.setFontSize(16);
        doc.text(`Calendario Diario - ${date}`, marginLeft, 15);

        const timelineWidth = Math.max(
          (pageWidth - marginLeft - marginRight) / specialists.length,
          colWidthMin
        );

        // Cabecera especialistas
        doc.setFontSize(12);
        specialists.forEach((specialist, colIndex) => {
          const x = marginLeft + colIndex * timelineWidth;
          doc.text(specialist, x + 2, marginTop);
          doc.line(x, marginTop + 2, x, pageHeight - marginTop);
        });

        // Filas horarias de 08:00 a 20:00
        const startHour = 9;
        const endHour = 20;
        const totalBlocks = ((endHour - startHour) * 60) / blockMinutes;

        for (let b = 0; b < totalBlocks; b++) {
          const hourDecimal = startHour + (b * blockMinutes) / 60;
          const hourLabel = `${Math.floor(hourDecimal)
            .toString()
            .padStart(2, '0')}:${hourDecimal % 1 === 0 ? '00' : '30'}`;
          const y = marginTop + 5 + b * rowHeight;

          doc.setFontSize(10);
          doc.text(hourLabel, marginLeft - 10, y + rowHeight / 2);

          specialists.forEach((specialist, colIndex) => {
            const x = marginLeft + colIndex * timelineWidth;
            const specialistReservations =
              reservationsBySpecialist[specialist] || [];

            const resInBlock = specialistReservations.find((res) => {
              const [hourStr, minuteStr] = res.hourAt.split(':');
              const startDecimal =
                parseInt(hourStr, 10) + parseInt(minuteStr, 10) / 60;
              return startDecimal === hourDecimal;
            });

            if (resInBlock) {
              const customer = resInBlock.customerId
                ? this.searchCustomer2(resInBlock.customerId)
                : null;
              const clientName = customer
                ? `${customer.firstName} ${customer.lastName}`
                : 'Sin cliente';
              const phone = customer?.phone ? `${customer.phone}` : '';
              const advice = resInBlock.requiresPersonalAdvice
                ? ' (Asesoría requerida)'
                : '';
              const status = statusMap[resInBlock.statusId] || 'N/A';

              // Primera línea: nombre + estado
              let text = `${clientName} (${status})`;
              doc.setFontSize(10);
              doc.setTextColor(0, 0, 0);
              doc.text(text, x + 2, y + rowHeight / 2 - 2);

              // Segunda línea: teléfono + asesoría
              const line2 = [phone, advice].filter(Boolean).join(' - ');
              if (line2) {
                doc.setFontSize(8);
                doc.text(line2, x + 2, y + rowHeight / 2 + 5);
                doc.setFontSize(10);
              }
            }
          });

          doc.line(marginLeft, y, pageWidth - marginRight, y);
        }
      }

      // 2️⃣ LISTA DIARIA para specialistId 999
      if (expressReservations.length > 0) {
        const reservationsBySpecialist = this.groupBy(
          expressReservations,
          (res) => this.searchSpecialist(res.specialistId)
        );
        const specialists = Object.keys(reservationsBySpecialist);

        doc.addPage();
        doc.setFontSize(16);
        doc.text(`Reservas Expres - ${date}`, marginLeft, 15);

        let y = marginTop + 10;

        for (const specialist of specialists) {
          const specialistReservations = reservationsBySpecialist[specialist];
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
          doc.text(specialist, marginLeft, y);
          y += lineHeight;

          const sortedRes = specialistReservations.sort((a, b) => {
            const [aH, aM] = a.hourAt.split(':').map(Number);
            const [bH, bM] = b.hourAt.split(':').map(Number);
            return aH * 60 + aM - (bH * 60 + bM);
          });

          for (const res of sortedRes) {
            const customer = res.customerId
              ? this.searchCustomer2(res.customerId)
              : null;
            const clientName = customer
              ? `${customer.firstName} ${customer.lastName}`
              : 'Sin cliente';
            const phone = customer?.phone ? ` - ${customer.phone}` : '';
            const advice = res.requiresPersonalAdvice
              ? ' (Asesoría requerida)'
              : '';
            const status = statusMap[res.statusId] || 'N/A';

            const text = `${res.hourAt} – Cliente: ${clientName} (${status})${phone}${advice}`;

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(text, marginLeft + 4, y);
            y += lineHeight;

            if (y > doc.internal.pageSize.getHeight() - 20) {
              doc.addPage();
              y = marginTop;
            }
          }

          y += lineHeight; // espacio entre especialistas
        }
      }
    }

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  }

  // Función genérica para agrupar elementos
  groupBy<T>(array: T[], keyFunc: (item: T) => string): { [key: string]: T[] } {
    return array.reduce((result, item) => {
      const key = keyFunc(item);
      if (!result[key]) result[key] = [];
      result[key].push(item);
      return result;
    }, {} as { [key: string]: T[] });
  }

  searchCustomer2(id: number) {
    return this.customers.find((c) => c.id === id) || null;
  }
}
