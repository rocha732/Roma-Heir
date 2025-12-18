import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { GetReservations } from 'src/app/core/models/reservations';
import { ReservationStatusesService } from 'src/app/core/services/reservation-statuses.service';
import { ReservationsService } from 'src/app/core/services/reservations.service';
import * as XLSX from 'xlsx';
import flatpickr from 'flatpickr';
import { Spanish } from 'flatpickr/dist/l10n/es';
import { Instance as FlatpickrInstance } from 'flatpickr/dist/types/instance';
import { UsersService } from 'src/app/core/services/users.service';
import { ResponseUsers } from 'src/app/core/models/users';

@Component({
  selector: 'app-view-reserve',
  templateUrl: './view-reservations.component.html',
  styleUrls: ['./view-reservations.component.scss'],
})
export class ViewReservationsComponent implements AfterViewInit {
  @ViewChild('dateRangeInput') dateRangeInput!: ElementRef;

  reservations: GetReservations[] = [];
  allReservations: GetReservations[] = [];
  rawReservations: GetReservations[] = [];
  users: ResponseUsers[] = [];
  monthKeys: string[] = [];
  searchTerm = '';
  monthlyChart!: Chart;
  page = 1;
  pageSize = 20;
  startDate?: Date;
  endDate?: Date;
  flatpickrInstance!: FlatpickrInstance;
  pieChart!: Chart<'pie', number[], string>;
  specialistsMap = new Map<number, string>();
  usersMap = new Map<number, any>();

  constructor(
    private reservationsService: ReservationsService,
    private reservationStatusesService: ReservationStatusesService,
    private usersService: UsersService
  ) {}

  ngOnInit() {
    this.loadSpecialists();
    this.loadUsers();
   this.reservationsService.getReservations().subscribe((res) => {
    this.rawReservations = res;
    this.loadUsers(); // 👈 cuando termina, mapea todo
  });
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
        return 'Activo';
      case 2:
        return 'Pendiente';
      case 3:
        return 'Cancelado';
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
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,

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

loadUsers() {
  this.usersService.getUsers().subscribe((users) => {
    users.forEach((u) => {
      this.usersMap.set(u.id, {
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        phone: u.phone,
      });
    });

    // 🔥 cuando ya tengo usuarios, proceso reservas
    this.mapReservations();
  });
}
mapReservations() {
  this.reservations = this.rawReservations.map((r) => {
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

  this.allReservations = this.reservations;

  this.createMonthlyChart();
  this.createPieChart();
}

}
