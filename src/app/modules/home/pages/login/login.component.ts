import { Component } from '@angular/core';
import { ApiService } from 'src/app/core/services/api.service';
import * as bootstrap from 'bootstrap';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  email: string = '';
  code: string = '';
  loading = false;
  private modalRef: any;
  constructor(private ApiService: ApiService, private router: Router) {
    this.loading = false
  }
  login() {
    if (!this.email) return;
    this.loading = true;
    this.ApiService.login({ email: this.email }).subscribe({
      next: (data) => {
        this.loading = false;
        console.log('✅ Email enviado, abre el modal de código');
        if (data.isValid) {
          const modalEl = document.getElementById('verifyModal');
          if (modalEl) {
            this.modalRef = new bootstrap.Modal(modalEl);
            this.modalRef.show();
          }
        } else {
          alert('Usuario no registrado');
        }
      },
      error: (err) => console.error('❌ Error login', err),
    });
  }

  verifyCode() {this.loading = true;
    if (!this.code) return;

    const payload: any = {
      email: this.email,
      code: this.code,
    };

    this.ApiService.verifyCode(payload).subscribe({
      next: (res) => { this.loading = false;
        if (res.isValid) {
          this.modalRef?.hide();
          localStorage.setItem('token', res.data.accessToken.token);
          this.router.navigate(['/home/dashboard']);
        } else {
          alert('Código incorrecto');
        }
      },
      error: (err) => console.error('❌ Error verificando código', err),
    });
  }
}
