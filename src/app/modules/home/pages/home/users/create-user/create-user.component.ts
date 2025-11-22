import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { UsersService } from 'src/app/core/services/users.service';
import { timer, Subscription } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NotificationModalComponent } from 'src/app/components/notification-modal/notification-modal.component';

@Component({
  selector: 'app-create-user',
  templateUrl: './create-user.component.html',
  styleUrls: ['./create-user.component.scss'],
})
export class CreateUserComponent {
  userForm: FormGroup;
  codeForm: FormGroup;

  countries = [
    { id: 1, name: 'Argentina', code: 'AR' },
    { id: 2, name: 'Bolivia', code: 'BO' },
    { id: 3, name: 'Brazil', code: 'BR' },
    { id: 4, name: 'Chile', code: 'CL' },
    { id: 5, name: 'Colombia', code: 'CO' },
    { id: 6, name: 'Ecuador', code: 'EC' },
    { id: 7, name: 'Guyana', code: 'GY' },
    { id: 8, name: 'Paraguay', code: 'PY' },
    { id: 9, name: 'Peru', code: 'PE' },
  ];

  submitted = false;
  timerSeconds = 30;
  timerSubscription!: Subscription;

  constructor(
    private fb: FormBuilder,
    private usersService: UsersService,
    private modalService: NgbModal
  ) {
    this.userForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{9,15}$/)]],
      countryId: ['', Validators.required],
    });

    this.codeForm = this.fb.group({
      verificationCode: [
        '',
        [Validators.required, Validators.minLength(4), Validators.maxLength(6)],
      ],
    });
  }

  get firstName(): FormControl {
    return this.userForm.get('firstName') as FormControl;
  }

  get lastName(): FormControl {
    return this.userForm.get('lastName') as FormControl;
  }

  get email(): FormControl {
    return this.userForm.get('email') as FormControl;
  }

  get phone(): FormControl {
    return this.userForm.get('phone') as FormControl;
  }

  get countryId(): FormControl {
    return this.userForm.get('countryId') as FormControl;
  }

  get verificationCode(): FormControl {
    return this.codeForm.get('verificationCode') as FormControl;
  }

  submit() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.usersService.postRegisterUser(this.userForm.value).subscribe({
      next: () => {
        this.submitted = true;
        this.startTimer();
      },
      error: (err) => console.error(err),
    });
  }

  startTimer() {
    this.timerSeconds = 30;
    this.timerSubscription?.unsubscribe();
    this.timerSubscription = timer(0, 1000).subscribe((sec) => {
      this.timerSeconds = 30 - sec;
      if (this.timerSeconds <= 0) {
        this.timerSubscription.unsubscribe();
      }
    });
  }

  resendCode() {
    this.usersService.postResendCode(this.userForm.value).subscribe({
      next: () => this.startTimer(),
      error: (err) => console.error(err),
    });
  }

  verifyCode() {
  if (this.codeForm.invalid) {
    this.codeForm.markAllAsTouched();
    return;
  }

  this.usersService
    .postVerifyAccount({
      email: this.userForm.value.email,
      code: this.verificationCode?.value,
    })
    .subscribe({
      next: (data) => {
        const modalRef = this.modalService.open(NotificationModalComponent, {
          centered: true,
        });

        if (data.isVerified) {
          modalRef.componentInstance.title = '¡Éxito!';
          modalRef.componentInstance.message =
            'Usuario creado y verificado con éxito.';
          modalRef.componentInstance.type = 'success';

          // Resetear formularios y cerrar card
          this.resetForms();

        } else {
          modalRef.componentInstance.title = 'Error';
          modalRef.componentInstance.message =
            'Código de verificación incorrecto. Por favor, intente nuevamente.';
          modalRef.componentInstance.type = 'error';
        }
      },
      error: (err) => console.error(err),
    });
}
  private resetForms() {
  // Resetear ambos formularios
  this.userForm.reset();
  this.codeForm.reset();

  // Cerrar el card de verificación
  this.submitted = false;

  // Detener timer si está corriendo
  this.timerSubscription?.unsubscribe();
  this.timerSeconds = 30;
}
}
