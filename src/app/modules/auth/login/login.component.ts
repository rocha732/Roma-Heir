import { Component } from '@angular/core';
import { ApiService } from 'src/app/core/services/api.service';
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
  showModal = false;

  constructor(private ApiService: ApiService, private router: Router) {}

  login() {
    if (!this.email) return;
    this.loading = true;

    this.ApiService.login({ email: this.email }).subscribe({
      next: (data) => {
        this.loading = false;
        console.log('✅ Email enviado');
        if (data.isValid) {
          this.showModal = true;
        } else {
          alert('Usuario no registrado');
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('❌ Error login', err);
      },
    });
  }

  verifyCode() {
    if (!this.code) return;
    this.loading = true;

    const payload = {
      email: this.email,
      code: this.code,
    };

    this.ApiService.verifyCode(payload).subscribe({
      next: (res) => {
        this.loading = false;
        console.log('[Login] Respuesta verifyCode:', res);
        if (res.isValid && res.data && res.data.accessToken && res.data.accessToken.token) {
          this.showModal = false;
          localStorage.setItem('token', res.data.accessToken.token);
          console.log('[Login] Token guardado en localStorage:', res.data.accessToken.token);
          this.router.navigate(['/home']);
        } else {
          alert('Código incorrecto o token no recibido');
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('❌ Error verificando código', err);
      },
    });
  }

  closeModal() {
    this.showModal = false;
    this.code = '';
  }
}
