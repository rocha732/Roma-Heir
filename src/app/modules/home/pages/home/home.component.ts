import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SpecialistsService } from 'src/app/core/services/specialists.service';
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  constructor(private specialistsService: SpecialistsService, private router: Router) {}
  ngOnInit(): void {
    if (!localStorage.getItem('specialists')) {
      this.specialistsService.getSpecialists().subscribe((specialists) => {
        localStorage.setItem('specialists', JSON.stringify(specialists));
      });
    }
  }

  logout() {
  localStorage.clear();  // o solo removeItem('token')
  this.router.navigate(['/']); // vuelve al login
}

}
