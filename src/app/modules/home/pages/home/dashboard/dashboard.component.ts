import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { GetReservations } from 'src/app/core/models/reservations';
import { ReservationsService } from 'src/app/core/services/reservations.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent {
  reservations: GetReservations[] = [];
  constructor(
    private reservationsService: ReservationsService,
    private router: Router
  ) {}
  ngOnInit(): void {
    this.reservationsService.getReservations().subscribe((reservations) => {
      this.reservations = reservations;
    });
  }
}
