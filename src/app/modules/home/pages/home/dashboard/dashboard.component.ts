import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { getReservationStatuses } from 'src/app/core/models/reservation-statuses';
import { GetReservations } from 'src/app/core/models/reservations';
import { ReservationStatusesService } from 'src/app/core/services/reservation-statuses.service';
import { ReservationsService } from 'src/app/core/services/reservations.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent {
  reservaciones: GetReservations[] = [];
  reservationStatuses: getReservationStatuses[] = [];
  resToday: { statusName: string; count: number }[] = [];
  pendientesTotal = 0;
  completadasHoy = 0;
  canceladas = 0;
  confirmadasHoy = 0;

  chartData: any;
  chartLabels: string[] = [];
  chartDatasets: any[] = [];
  selectedRange: 'week' | 'month' | 'all' = 'week';
  allReservations: GetReservations[] = [];

  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: {}, y: { beginAtZero: true } },
  };

  constructor(
    private reservationsService: ReservationsService,
    private reservationStatusesService: ReservationStatusesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.reservationStatusesService.getStatusReservations().subscribe((statuses) => {
      this.reservationStatuses = statuses;

      this.reservationsService.getReservations().subscribe((reservations) => {
        this.reservaciones = reservations;
        this.allReservations = reservations;

        const todayReservations = this.getTodayReservations(reservations);
        this.resToday = this.getCountByStatus(todayReservations, statuses);
        this.calcDashboardValues();

        // Inicializar gráfico
        this.updateChartData();
      });
    });
  }

 getTodayReservations(reservations: GetReservations[]) {
  const today = new Date().toISOString().substring(0, 10); // "YYYY-MM-DD"
  return reservations.filter(
    (r) => new Date(r.reservedAt).toISOString().substring(0, 10) === today
  );
}

  getCountByStatus(reservationsToday: GetReservations[], statuses: getReservationStatuses[]) {
    const countMap = new Map<number, number>();
    reservationsToday.forEach((res) => {
      countMap.set(res.statusId, (countMap.get(res.statusId) || 0) + 1);
    });

    return statuses.map((s) => ({
      statusName: s.name,
      count: countMap.get(s.id) || 0,
    }));
  }

  calcDashboardValues() {
    const get = (name: string) => this.resToday.find((s) => s.statusName === name)?.count ?? 0;
    this.pendientesTotal = get('Pendiente') + get('Reprogramada');
    this.completadasHoy = get('Completada');
    this.confirmadasHoy = get('Confirmada');
    this.canceladas = get('Cancelada');
  }

  getColorByStatus(statusId: number) {
    const colors: any = {
      1: 'rgba(255,193,7,0.7)',   // Pendiente
      2: 'rgba(33,150,243,0.7)',  // Confirmada
      3: 'rgba(244,67,54,0.7)',   // Cancelada
      4: 'rgba(76,175,80,0.7)',   // Completada
      5: 'rgba(158,158,158,0.7)', // Ausente
      6: 'rgba(156,39,176,0.7)',  // Reprogramada
    };
    return colors[statusId] || 'rgba(100,100,100,0.7)';
  }

  changeRange(range: 'week' | 'month' | 'all') {
    this.selectedRange = range;
    this.updateChartData();
  }

  getFilteredReservations(): GetReservations[] {
    const today = new Date();

    if (this.selectedRange === 'week') {
      const last7 = new Date();
      last7.setDate(today.getDate() - 6);
      return this.allReservations.filter((r) => new Date(r.reservedAt) >= last7);
    }

    if (this.selectedRange === 'month') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return this.allReservations.filter((r) => new Date(r.reservedAt) >= monthStart);
    }

    return this.allReservations; // total
  }

  /** Agrupa por fecha y status para mantener colores en el gráfico */
groupByDateAndStatus(reservations: GetReservations[]) {
  const grouped: Record<string, Record<number, number>> = {};

  for (const r of reservations) {
    // Convertimos la fecha a string YYYY-MM-DD
    const date = new Date(r.reservedAt).toISOString().substring(0, 10);

    if (!grouped[date]) grouped[date] = {};
    if (!grouped[date][r.statusId]) grouped[date][r.statusId] = 0;

    grouped[date][r.statusId]++;
  }

  return grouped;
}


  updateChartData() {
    const filtered = this.getFilteredReservations();
    const grouped = this.groupByDateAndStatus(filtered);

    this.chartLabels = Object.keys(grouped).sort();

    this.chartDatasets = this.reservationStatuses.map((status) => ({
      label: status.name,
      data: this.chartLabels.map((date) => grouped[date][status.id] || 0),
      backgroundColor: this.getColorByStatus(status.id),
    }));

    this.chartData = {
      labels: this.chartLabels,
      datasets: this.chartDatasets,
    };
  }
}
