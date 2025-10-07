import { Component } from '@angular/core';
import { ApiService } from 'src/app/core/services/api.service';
import * as bootstrap from 'bootstrap';
import { ActivatedRoute, Router } from '@angular/router';
@Component({
  selector: 'app-reservar-cita-cliente',
  templateUrl: './reservar-cita-cliente.component.html',
  styleUrls: ['./reservar-cita-cliente.component.scss'],
})
export class ReservarCitaClienteComponent {
  specialists: any[] = localStorage.getItem('specialists')
    ? JSON.parse(localStorage.getItem('specialists') || '[]')
    : [];
  weekDays: any[] = [];
  morningSlots: string[] = [];
  afternoonSlots: string[] = [];
  eveningSlots: string[] = [];
  selectedDate: any = null;
  selectedSpecialistId: number | null = null;
  selectedTime: string = '';
  loading: boolean = false;
  hasSlots: boolean = false;
  customersId!: string;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    console.log(this.specialists);
    this.route.queryParams.subscribe((params) => {
      this.customersId = params['customersId']; // aquí recibes el valor
      console.log('customersId recibido:', this.customersId);
    });
  }

  ngOnInit(): void {
    this.weekDays = this.getNext7Days();
    
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
    this.selectedDate = date;
    this.loading = true;
    this.selectedTime = '';
    this.api.getBusinessHours(date.weekday).subscribe({
      next: (data) => {
        this.loading = false;
        console.log('Data recibida:', data);

        const today = new Date();
        const todayStr = today.toLocaleDateString('en-CA');

        if (date.fecha === todayStr) {
          // si selecciona HOY → filtramos slots
          this.filterSlots(data);
        } else {
          // si selecciona otro día → usamos los slots completos
          this.morningSlots = data.morningSlots || [];
          this.afternoonSlots = data.afternoonSlots || [];
          this.eveningSlots = data.eveningSlots || [];
          this.hasSlots =
            this.morningSlots.length > 0 ||
            this.afternoonSlots.length > 0 ||
            this.eveningSlots.length > 0;
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error fetching business hours:', error);
      },
    });
  }

  filterSlots(data: any) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const nowInMinutes = currentHour * 60 + currentMinute;

    const toMinutes = (time: string): number => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    this.morningSlots = data.morningSlots.filter(
      (slot: string) => toMinutes(slot) > nowInMinutes
    );

    this.afternoonSlots = data.afternoonSlots.filter(
      (slot: string) => toMinutes(slot) > nowInMinutes
    );

    this.eveningSlots = data.eveningSlots.filter(
      (slot: string) => toMinutes(slot) > nowInMinutes
    );

    this.hasSlots =
      this.morningSlots.length > 0 ||
      this.afternoonSlots.length > 0 ||
      this.eveningSlots.length > 0;

    console.log('Slots filtrados (hoy):', {
      morning: this.morningSlots,
      afternoon: this.afternoonSlots,
      evening: this.eveningSlots,
    });
  }

  selectTime(slot: string) {
    this.selectedTime = slot;
    this.selectedSpecialistId = null;
  }

  selectSpecialist(specialistId: number) {
    this.selectedSpecialistId = specialistId;
  }

  confirmAppointment() {
    this.loading = true;
    // Aquí puedes llamar a tu API para guardar la cita 👇
    const data = {
      customerId: this.customersId, // <- deberías obtenerlo dinámicamente
      specialistId: this.selectedSpecialistId,
      requiresPersonalAdvice: false,
      hourAt: this.selectedTime,
      reservedAt: this.selectedDate?.fecha,
    };

    this.api.postReservation(data).subscribe({
      next: (res) => {
        console.log('Cita reservada:', res);
        this.loading = false;
        this.openConfirmModal();
      },
      error: (err) => {
        this.loading = false;
        console.error('Error reservando cita:', err);
        alert('Error reservando cita ❌');
      },
    });
  }

  openConfirmModal() {
    const modalEl = document.getElementById('confirmModal');
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }
  goDashboard() {
    this.router.navigate(['/home/dashboard']);
  }
}
