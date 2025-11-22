import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ChartOptions } from 'chart.js';
import { Orders } from 'src/app/core/models/orders';
import { getReservationStatuses } from 'src/app/core/models/reservation-statuses';
import { GetReservations } from 'src/app/core/models/reservations';
import { OrdersService } from 'src/app/core/services/orders.service';
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
  specialists = JSON.parse(localStorage.getItem('specialists') || '[]');
  chartData: any;
  orders: Orders[] = [];
  totalOrders = 0;
  paidOrders = 0;
  unpaidOrders = 0;
  totalRevenue = 0;

pieOrdersChartData: any;
ordersChartData: any;
  selectedRange: 'week' | 'month' | 'all' = 'week';
  allReservations: GetReservations[] = [];
  chartLabels: string[] = [];
  chartDatasets: any[] = [];
  chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {},
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0, // fuerza enteros
          // opcionalmente, también podrías usar callback para mayor control
          // callback: (value) => Math.round(Number(value)),
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
        position: 'bottom', // ✅ esto es válido
        labels: {
          font: {
            size: 12,
          },
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
    private ordersService: OrdersService 
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.reservationStatusesService
      .getStatusReservations()
      .subscribe((statuses) => {
        this.reservationStatuses = statuses;

        this.reservationsService.getReservations().subscribe((reservations) => {
          this.reservaciones = reservations;
          this.allReservations = reservations;

          const todayReservations = this.getTodayReservations(reservations);
          this.resToday = this.getCountByStatus(todayReservations, statuses);
          this.calcDashboardValues();

          // Inicializar gráfico
          this.updateChartData();
          this.buildSpecialistPieChart(this.specialists, this.reservaciones);
        });
      });

       this.ordersService.getOrders().subscribe((res: Orders[]) => {
      this.orders = res;
      this.calculateOrdersMetrics();
      this.buildOrdersPieChart();
      this.buildOrdersChartData();
    });
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
      1: 'rgba(255,193,7,0.7)', // Pendiente
      2: 'rgba(33,150,243,0.7)', // Confirmada
      3: 'rgba(244,67,54,0.7)', // Cancelada
      4: 'rgba(76,175,80,0.7)', // Completada
      5: 'rgba(158,158,158,0.7)', // Ausente
      6: 'rgba(156,39,176,0.7)', // Reprogramada
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
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40',
            '#C9CBCF',
            '#8BC34A',
            '#FFC107',
          ],
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
    this.pieOrdersChartData  = {
      labels: ['Pagadas', 'No pagadas'],
      datasets: [
        { data: [this.paidOrders, this.unpaidOrders], backgroundColor: ['#4caf50', '#f44336'] }
      ]
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
        backgroundColor: '#4caf50',
      },
      {
        label: 'No pagadas',
        data: unpaidData,
        backgroundColor: '#f44336',
      },
    ],
  };
}


}
