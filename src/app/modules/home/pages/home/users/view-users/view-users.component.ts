import { Component, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Chart } from 'chart.js';
import { ResponseUsers } from 'src/app/core/models/users';
import { UsersService } from 'src/app/core/services/users.service';

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
    { id: 1, name: 'admin' },
    { id: 2, name: 'specialist' },
    { id: 3, name: 'client' },
  ];

    roleChart!: Chart<'doughnut', number[], string>;
  countryChart!: Chart<'bar', number[], string>;

  constructor(
    private usersService: UsersService,
    private cdr: ChangeDetectorRef
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
      error: (err) => console.error(err)
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

    // Volver a generar gráficos con nuevos datos
    this.createCharts();
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

    this.countryChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(counts),
        datasets: [
          {
            label: 'Usuarios por país',
            data: Object.values(counts),
            backgroundColor: ['#4e79a7', '#f28e2b', '#76b7b2'],
          },
        ],
      },
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

    this.roleChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(counts),
        datasets: [
          {
            data: Object.values(counts),
            backgroundColor: ['#59a14f', '#e15759', '#edc948'],
          },
        ],
      },
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
}
