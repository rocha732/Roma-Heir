import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SpecialistsService } from 'src/app/core/services/specialists.service';
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  isSpecialistOpen = false;
  isProductOpen = false;
  isOrderOpen = false;
  showLogoutScreen = false;

  constructor(private specialistsService: SpecialistsService, private router: Router) {}

  ngOnInit(): void {
    if (!localStorage.getItem('specialists')) {
      this.specialistsService.getSpecialists().subscribe((specialists) => {
        localStorage.setItem('specialists', JSON.stringify(specialists));
      });
    }
  }

  logout() {
    this.showLogoutScreen = true;
    
    // Esperar la animación y luego redirigir
    setTimeout(() => {
      localStorage.clear();
      this.router.navigate(['/']);
    }, 2500);
  }

  toggleSpecialistDropdown() {
    this.isSpecialistOpen = !this.isSpecialistOpen;
  }

  toggleProductDropdown() {
    this.isProductOpen = !this.isProductOpen;
  }

  toggleOrderDropdown() {
    this.isOrderOpen = !this.isOrderOpen;
  }
}
