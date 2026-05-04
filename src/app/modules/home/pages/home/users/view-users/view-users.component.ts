import { Component, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Chart } from 'chart.js';
import { ResponseUsers } from 'src/app/core/models/users';
import { UsersService } from 'src/app/core/services/users.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NotificationModalComponent } from 'src/app/components/notification-modal/notification-modal.component';

@Component({
  selector: 'app-view-users',
  templateUrl: './view-users.component.html',
  styleUrls: ['./view-users.component.scss'],
})
export class ViewUsersComponent implements OnDestroy {
  users: ResponseUsers[] = [];
  filteredUsers: ResponseUsers[] = [];

  filterCountry = '';
  filterRole = '';
  filterName = '';
  filterEmail = '';
  filterLastName = '';

  currentPage = 1;
  pageSize = 12;

  loading = true;

  countries: string[] = [];
  roles = [
    { id: 1, name: 'customer' },
    { id: 2, name: 'specialist' },
    { id: 3, name: 'admin' },
  ];

  roleChart!: Chart<'pie', number[], string>;
  countryChart!: Chart<'pie', number[], string>;

  constructor(
    private usersService: UsersService,
    private cdr: ChangeDetectorRef,
    private modalService: NgbModal
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.countryChart?.destroy();
    this.roleChart?.destroy();
  }

  // 🔥 Cargar usuarios y generar gráficos solo cuando DOM está listo
  loadUsers() {
    this.loading = true;

    this.usersService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.filteredUsers = [...data];

        this.countries = [
          ...new Set(data.filter(u => u.country?.name).map(u => u.country!.name))
        ];

        this.loading = false;

        // 🔥 Forzar a Angular a renderizar este *ngIf antes de generar charts
        this.cdr.detectChanges();

        // Ahora sí: DOM listo → charts listos
        setTimeout(() => {
          this.createCharts();
        }, 50);
      },
      error: (err) => {
        this.loading = false;
        const message = err?.error?.detail || err?.error?.message || 'No se pudo cargar la lista de usuarios.';
        const modalRef = this.modalService.open(NotificationModalComponent, { centered: true });
        modalRef.componentInstance.title = 'Error';
        modalRef.componentInstance.message = message;
        modalRef.componentInstance.type = 'error';
      }
    });
  }

  /** 🔥 Centraliza creación de gráficos */
  createCharts() {
    this.generateCountryChart();
    this.generateRoleChart();
  }

  /** ⭐ Filtros y gráficos */
  applyFilters() {
    this.filteredUsers = this.users.filter((u) => {
      const matchCountry = this.filterCountry ? u.country?.name === this.filterCountry : true;
      const matchRole = this.filterRole ? u.role?.name === this.filterRole : true;
      const matchName = this.filterName ? u.firstName?.toLowerCase().includes(this.filterName.toLowerCase()) : true;
      const matchLastName = this.filterLastName ? u.lastName?.toLowerCase().includes(this.filterLastName.toLowerCase()) : true;
      const matchEmail = this.filterEmail ? u.email?.toLowerCase().includes(this.filterEmail.toLowerCase()) : true;

      return matchCountry && matchRole && matchName && matchLastName && matchEmail;
    });

    this.currentPage = 1;
    // Volver a generar gráficos con nuevos datos
    this.createCharts();
  }

  clearFilters() {
    this.filterName = '';
    this.filterLastName = '';
    this.filterEmail = '';
    this.filterCountry = '';
    this.filterRole = '';
    this.applyFilters();
  }

  /** 📊 Gráfico por país */
  generateCountryChart() {
    const ctx = document.getElementById('countryChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.countryChart?.destroy();

    const counts: Record<string, number> = {};
    this.filteredUsers.forEach((u) => {
      const c = u.country?.name ?? 'Sin país';
      counts[c] = (counts[c] || 0) + 1;
    });

    const colors = [
      'rgba(59, 130, 246, 0.8)',   // Azul
      'rgba(168, 85, 247, 0.8)',   // Púrpura
      'rgba(16, 185, 129, 0.8)',   // Verde
      'rgba(251, 191, 36, 0.8)',   // Amarillo
      'rgba(239, 68, 68, 0.8)',    // Rojo
      'rgba(236, 72, 153, 0.8)',   // Rosa
      'rgba(20, 184, 166, 0.8)',   // Teal
      'rgba(249, 115, 22, 0.8)',   // Naranja
    ];

    this.countryChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(counts),
        datasets: [
          {
            data: Object.values(counts),
            backgroundColor: colors.slice(0, Object.keys(counts).length),
            borderColor: 'rgba(18, 19, 26, 0.8)',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: 'rgba(255, 255, 255, 0.8)',
              padding: 15,
              font: { size: 12 }
            }
          }
        }
      }
    });
  }

  /** 📊 Gráfico por rol */
  generateRoleChart() {
    const ctx = document.getElementById('roleChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.roleChart?.destroy();

    const counts: Record<string, number> = {};
    this.filteredUsers.forEach((u) => {
      const r = u.role?.name ?? 'Sin rol';
      counts[r] = (counts[r] || 0) + 1;
    });

    const colors = [
      'rgba(239, 68, 68, 0.8)',    // Rojo - Admin
      'rgba(251, 191, 36, 0.8)',   // Amarillo - Specialist
      'rgba(16, 185, 129, 0.8)',   // Verde - Client
    ];

    this.roleChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(counts),
        datasets: [
          {
            data: Object.values(counts),
            backgroundColor: colors.slice(0, Object.keys(counts).length),
            borderColor: 'rgba(18, 19, 26, 0.8)',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: 'rgba(255, 255, 255, 0.8)',
              padding: 15,
              font: { size: 12 }
            }
          }
        }
      }
    });
  }

  /** Paginación */
  get paginatedUsers() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  totalPages() {
    return Math.ceil(this.filteredUsers.length / this.pageSize);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage = page;
    }
  }

  /** Estadísticas */
  get totalUsers(): number {
    return this.filteredUsers.length;
  }

  get adminUsers(): number {
    return this.filteredUsers.filter(u => u.role?.name?.toLowerCase() === 'admin').length;
  }

  get specialistUsers(): number {
    return this.filteredUsers.filter(u => u.role?.name?.toLowerCase() === 'specialist').length;
  }

  get customerUsers(): number {
    return this.filteredUsers.filter(u => u.role?.name?.toLowerCase() === 'customer').length;
  }

  get totalCountries(): number {
    return this.countries.length;
  }
}
