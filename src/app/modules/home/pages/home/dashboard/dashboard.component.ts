import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ChartOptions } from 'chart.js';
import { Orders } from 'src/app/core/models/orders';
import { getReservationStatuses } from 'src/app/core/models/reservation-statuses';
import { GetReservations } from 'src/app/core/models/reservations';
import { OrdersService } from 'src/app/core/services/orders.service';
import { ReservationStatusesService } from 'src/app/core/services/reservation-statuses.service';
import { ReservationsService } from 'src/app/core/services/reservations.service';
import { SpecialistsService } from 'src/app/core/services/specialists.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NotificationModalComponent } from 'src/app/components/notification-modal/notification-modal.component';

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
  specialists: any[] = [];
  chartData: any;
  orders: Orders[] = [];
  totalOrders = 0;
  paidOrders = 0;
  unpaidOrders = 0;
  totalRevenue = 0;

  // Loading states
  loadingCitas = true;
  loadingOrders = true;
  
  // Empty states
  noSpecialists = false;
  noReservations = false;

  pieOrdersChartData: any;
  ordersChartData: any;
  selectedRange: 'week' | 'month' | 'all' = 'all';
  allReservations: GetReservations[] = [];
  chartLabels: string[] = [];
  chartDatasets: any[] = [];
  chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          precision: 0,
          color: 'rgba(255, 255, 255, 0.6)',
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          padding: 15,
          font: { size: 11 },
        },
      },
    },
  };
  pieChartData: any;
  pieChartOptions: ChartOptions<'pie'> = {
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
      tooltip: {
        callbacks: {
          label: (tooltipItem: any) => {
            const label = tooltipItem.label || '';
            const value = tooltipItem.raw || 0;
            return `${label}: ${value}`;
          },
        },
      },
    },
  };

  constructor(
    private reservationsService: ReservationsService,
    private reservationStatusesService: ReservationStatusesService,
    private ordersService: OrdersService,
    private specialistsService: SpecialistsService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loadingCitas = true;
    this.loadingOrders = true;

    // Cargar especialistas primero
    const storedSpecialists = localStorage.getItem('specialists');
    if (storedSpecialists) {
      this.specialists = JSON.parse(storedSpecialists);
      this.loadReservationsData();
    } else {
      this.specialistsService.getSpecialists().subscribe({
        next: (specialists) => {
          this.specialists = specialists;
          localStorage.setItem('specialists', JSON.stringify(specialists));
          this.loadReservationsData();
        },
        error: (err) => {
          this.noSpecialists = true;
          this.loadReservationsData();
          this.openErrorModal(err, 'No se pudo cargar la lista de especialistas.');
        }
      });
    }

    // Cargar órdenes
    this.ordersService.getOrders().subscribe({
      next: (res: Orders[]) => {
        this.orders = res;
        this.calculateOrdersMetrics();
        this.buildOrdersPieChart();
        this.buildOrdersChartData();
        this.loadingOrders = false;
      },
      error: (err) => {
        this.loadingOrders = false;
        this.openErrorModal(err, 'No se pudo cargar las órdenes.');
      }
    });
  }

  loadReservationsData() {
    this.reservationStatusesService
      .getStatusReservations()
      .subscribe({
        next: (statuses) => {
          this.reservationStatuses = statuses;

          this.reservationsService.getReservations().subscribe({
            next: (reservations) => {
              this.reservaciones = reservations;
              this.allReservations = reservations;
              this.noReservations = reservations.length === 0;

              const todayReservations = this.getTodayReservations(reservations);
              this.resToday = this.getCountByStatus(todayReservations, statuses);
              this.calcDashboardValues();

              // Inicializar gráficos
              this.updateChartData();
              this.buildSpecialistPieChart(this.specialists, this.reservaciones);
              this.loadingCitas = false;
            },
            error: (err) => {
              this.noReservations = true;
              this.loadingCitas = false;
              this.openErrorModal(err, 'No se pudo cargar las reservaciones.');
            }
          });
        },
        error: (err) => {
          this.loadingCitas = false;
          this.openErrorModal(err, 'No se pudo cargar los estados de reservación.');
        }
      });
  }

  private openErrorModal(err: any, defaultMsg: string) {
    const message = err?.error?.detail || err?.error?.message || err?.error?.title || defaultMsg;
    const modalRef = this.modalService.open(NotificationModalComponent, { centered: true });
    modalRef.componentInstance.title = 'Error';
    modalRef.componentInstance.message = message;
    modalRef.componentInstance.type = 'error';
  }

  getTodayReservations(reservations: GetReservations[]) {
    const today = new Date().toISOString().substring(0, 10); // "YYYY-MM-DD"
    return reservations.filter(
      (r) => new Date(r.reservedAt).toISOString().substring(0, 10) === today
    );
  }

  getCountByStatus(
    reservationsToday: GetReservations[],
    statuses: getReservationStatuses[]
  ) {
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
    const get = (name: string) =>
      this.resToday.find((s) => s.statusName === name)?.count ?? 0;
    this.pendientesTotal = get('Pendiente') + get('Reprogramada');
    this.completadasHoy = get('Completada');
    this.confirmadasHoy = get('Confirmada');
    this.canceladas = get('Cancelada');
  }

  getColorByStatus(statusId: number) {
    const colors: any = {
      1: 'rgba(251, 191, 36, 0.8)',  // Pendiente - Amarillo
      2: 'rgba(59, 130, 246, 0.8)',  // Confirmada - Azul
      3: 'rgba(239, 68, 68, 0.8)',   // Cancelada - Rojo
      4: 'rgba(16, 185, 129, 0.8)',  // Completada - Verde
      5: 'rgba(107, 114, 128, 0.8)', // Ausente - Gris
      6: 'rgba(168, 85, 247, 0.8)',  // Reprogramada - Púrpura
    };
    return colors[statusId] || 'rgba(100, 100, 100, 0.7)';
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
      return this.allReservations.filter(
        (r) => new Date(r.reservedAt) >= last7
      );
    }

    if (this.selectedRange === 'month') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return this.allReservations.filter(
        (r) => new Date(r.reservedAt) >= monthStart
      );
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

  buildSpecialistPieChart(specialists: any[], reservations: GetReservations[]) {
    // Contar reservaciones por specialistId
    const countMap = new Map<number, number>();
    reservations.forEach((res) => {
      countMap.set(res.specialistId, (countMap.get(res.specialistId) || 0) + 1);
    });

    // Generar labels y datos
    const labels: string[] = [];
    const data: number[] = [];

    specialists.forEach((spec) => {
      const count = countMap.get(spec.id) || 0;
      labels.push(`${spec.firstName} ${spec.lastName}`);
      data.push(count);
    });

    this.pieChartData = {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',   // Azul
            'rgba(168, 85, 247, 0.8)',   // Púrpura
            'rgba(16, 185, 129, 0.8)',   // Verde
            'rgba(251, 191, 36, 0.8)',   // Amarillo
            'rgba(239, 68, 68, 0.8)',    // Rojo
            'rgba(236, 72, 153, 0.8)',   // Rosa
            'rgba(20, 184, 166, 0.8)',   // Teal
            'rgba(249, 115, 22, 0.8)',   // Naranja
            'rgba(139, 92, 246, 0.8)',   // Violeta
          ],
          borderColor: 'rgba(18, 19, 26, 0.8)',
          borderWidth: 2,
        },
      ],
    };
  }

   calculateOrdersMetrics() {
    this.totalOrders = this.orders.length;
    this.paidOrders = this.orders.filter(o => o.paid).length;
    this.unpaidOrders = this.orders.filter(o => !o.paid).length;
    this.totalRevenue = this.orders.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
  }

  buildOrdersPieChart() {
    this.pieOrdersChartData = {
      labels: ['Pagadas', 'No pagadas'],
      datasets: [
        {
          data: [this.paidOrders, this.unpaidOrders],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',  // Verde
            'rgba(239, 68, 68, 0.8)',   // Rojo
          ],
          borderColor: 'rgba(18, 19, 26, 0.8)',
          borderWidth: 2,
        },
      ],
    };
  }
buildOrdersChartData() {
  // Agrupar por fecha y estado de pago
  const grouped: Record<string, { paid: number; unpaid: number }> = {};

  this.orders.forEach(order => {
    const date = new Date(order.createdAt).toISOString().substring(0, 10);
    if (!grouped[date]) grouped[date] = { paid: 0, unpaid: 0 };
    if (order.paid) {
      grouped[date].paid += 1;
    } else {
      grouped[date].unpaid += 1;
    }
  });

  const labels = Object.keys(grouped).sort();
  const paidData = labels.map(label => grouped[label].paid);
  const unpaidData = labels.map(label => grouped[label].unpaid);

  this.ordersChartData = {
    labels,
    datasets: [
      {
        label: 'Pagadas',
        data: paidData,
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      },
      {
        label: 'No pagadas',
        data: unpaidData,
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1,
      },
    ],
  };
}


}
