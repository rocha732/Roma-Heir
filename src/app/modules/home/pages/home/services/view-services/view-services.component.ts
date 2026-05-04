import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { SalonServiceBrief } from 'src/app/core/models/salon-service';
import { SalonServicesService } from 'src/app/core/services/salon-services.service';

@Component({
  selector: 'app-view-services',
  templateUrl: './view-services.component.html',
  styleUrls: ['./view-services.component.scss'],
})
export class ViewServicesComponent implements OnInit {
  services: SalonServiceBrief[] = [];
  /** Placeholder rows for el skeleton del listado */
  skeletonRows = [0, 1, 2, 3, 4];
  loading = true;
  errorMsg: string | null = null;

  constructor(
    private salonServices: SalonServicesService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadServices();
  }

  loadServices() {
    this.loading = true;
    this.errorMsg = null;
    this.salonServices
      .getServices()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (rows) => (this.services = Array.isArray(rows) ? [...rows] : []),
        error: (err) => {
          this.services = [];
          this.errorMsg =
            err?.error?.detail ||
            err?.error?.title ||
            'No se pudo obtener el listado de servicios.';
        },
      });
  }

  manageStylists(s: SalonServiceBrief) {
    this.router.navigate(['/home', 'services', s.id, 'stylists'], {
      state: { svc: { id: s.id, name: s.name } },
    });
  }

  trimDescription(d?: string, max = 90): string {
    if (!d) return '';
    const t = d.trim();
    if (t.length <= max) return t;
    return t.slice(0, max).trimEnd() + '…';
  }
}
