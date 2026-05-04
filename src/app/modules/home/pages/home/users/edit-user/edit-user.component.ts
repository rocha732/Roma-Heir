import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Country, ResponseUsers } from 'src/app/core/models/users';
import { UsersService } from 'src/app/core/services/users.service';
import { finalize } from 'rxjs';
import { ProcessingOverlayService } from 'src/app/core/services/processing-overlay.service';

@Component({
  selector: 'app-edit-user',
  templateUrl: './edit-user.component.html',
  styleUrls: ['./edit-user.component.scss'],
})
export class EditUserComponent {
  searchQuery: string = '';
  searching: boolean = false;
  deleting: boolean = false;
  showDeleteModal: boolean = false;
  showErrorModal: boolean = false;
  errorMessage: string = '';

  user: ResponseUsers | null = null;
  previewImage: string | ArrayBuffer | null = null;
  selectedPicture: File | null = null;
  
  // Separate properties for select binding
  selectedCountryId: number | null = null;
  selectedRoleId: number = 3;

  countries: Country[] = [];
  loadingCountries = false;

  constructor(
    private userService: UsersService,
    private route: ActivatedRoute,
    private router: Router,
    private processingOverlay: ProcessingOverlayService
  ) {}

  ngOnInit() {
    this.loadCountries();
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.searchQuery = id;
      this.searchUsers();
    }
  }

  loadCountries() {
    this.loadingCountries = true;
    this.userService.getCountries().subscribe({
      next: (data) => {
        this.countries = data ?? [];
        this.loadingCountries = false;

        // Si todavía no hay país seleccionado pero sí hay lista, dejamos "sin selección"
        // (el valor real se setea cuando llegue el user).
      },
      error: (err) => {
        console.error('Error loading countries:', err);
        this.countries = [];
        this.loadingCountries = false;
      },
    });
  }

  onSearchChange() {
    if (!this.searchQuery || this.searchQuery.trim() === '') {
      this.user = null;
      return;
    }
    this.searchUsers();
  }

  searchUsers() {
    this.searching = true;

    const id = Number(this.searchQuery);
    if (isNaN(id)) {
      this.user = null;
      this.searching = false;
      return;
    }

    this.userService.getUserById(id).subscribe({
      next: (resp) => {
        this.user = resp;
        this.selectedCountryId = resp.country?.id ?? null;
        this.selectedRoleId = resp.role?.id || 3;
        this.previewImage = null;
        this.searching = false;
      },
      error: (err) => {
        console.error('Error:', err);
        this.user = null;
        this.searching = false;
      },
    });
  }

  onSelectPicture(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedPicture = file;

      const reader = new FileReader();
      reader.onload = () => (this.previewImage = reader.result);
      reader.readAsDataURL(file);
    }
  }

  saveUser() {
    if (!this.user) return;
    if (!this.selectedCountryId) {
      this.showError('Por favor, selecciona un país.');
      return;
    }

    const formData = new FormData();

    formData.append('Id', this.user.id.toString());
    formData.append('FirstName', this.user.firstName);
    formData.append('LastName', this.user.lastName);
    formData.append('Email', this.user.email);
    formData.append('Phone', this.user.phone);
    formData.append('CountryId', this.selectedCountryId.toString());
    formData.append('RoleId', this.selectedRoleId.toString());

    if (this.selectedPicture) {
      formData.append('Picture', this.selectedPicture);
    }

    this.processingOverlay.show('Estamos actualizando el usuario');

    this.userService
      .putUpdateUser(formData, this.user.id)
      .pipe(
        finalize(() => {
          this.processingOverlay.hide();
        })
      )
      .subscribe({
      next: () => {
        console.log('Usuario actualizado');
        this.router.navigate(['/home/users/view-users']);
      },
      error: (err) => {
        console.error('Error al guardar usuario:', err);
        
        let errorMessage = 'No se pudo guardar los cambios';
        
        if (err.status === 401) {
          errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
        } else if (err.status === 400) {
          errorMessage = 'Los datos ingresados no son válidos.';
        } else if (err.error?.detail) {
          errorMessage = err.error.detail;
        }
        
        this.showError(errorMessage);
      },
    });
  }

  deleteUser() {
    if (!this.user) return;
    this.showDeleteModal = true;
  }

  confirmDelete() {
    if (!this.user) return;

    this.deleting = true;
    this.showDeleteModal = false;

    this.userService.deleteUser(this.user.id).subscribe({
      next: () => {
        console.log('Usuario eliminado correctamente');
        this.deleting = false;
        this.router.navigate(['/users/view-users']);
      },
      error: (err) => {
        console.error('Error al eliminar usuario:', err);
        this.deleting = false;
        
        let errorMessage = 'No se pudo eliminar el usuario';
        
        if (err.status === 401) {
          errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
        } else if (err.status === 403) {
          errorMessage = 'No tienes permisos para eliminar este usuario.';
        } else if (err.status === 404) {
          errorMessage = 'El usuario no existe.';
        } else if (err.status === 500) {
          const errorDetail = err.error?.detail || 'Error interno del servidor';
          errorMessage = errorDetail;
        } else if (err.error?.detail) {
          errorMessage = err.error.detail;
        }
        
        this.showError(errorMessage);
      },
    });
  }

  cancelDelete() {
    this.showDeleteModal = false;
  }

  showError(message: string) {
    this.errorMessage = message;
    this.showErrorModal = true;
  }

  closeError() {
    this.showErrorModal = false;
    this.errorMessage = '';
  }

  getInitials(): string {
    if (!this.user) return '';
    const firstName = this.user.firstName?.charAt(0).toUpperCase() || '';
    const lastName = this.user.lastName?.charAt(0).toUpperCase() || '';
    return firstName + lastName;
  }

  hasProfileImage(): boolean {
    return this.previewImage !== null || !!(this.user?.profileImageUrl?.trim());
  }
}
