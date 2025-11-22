import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ResponseUsers } from 'src/app/core/models/users';
import { UsersService } from 'src/app/core/services/users.service';

@Component({
  selector: 'app-edit-user',
  templateUrl: './edit-user.component.html',
  styleUrls: ['./edit-user.component.scss'],
})
export class EditUserComponent {
  searchQuery: string = '';
  searching: boolean = false;

  user: ResponseUsers | null = null; // <--- NECESARIO
  previewImage: string | ArrayBuffer | null = null;
  selectedPicture: File | null = null;

  constructor(
    private userService: UsersService,
    private route: ActivatedRoute
  ) {}
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.searchQuery = id;
      this.searchUsers(); // <--- LLAMA AUTOMÁTICAMENTE
    }
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
        this.user = resp; // <--- EL CARD APARECE AQUÍ
        this.previewImage = null; // limpiar vista previa
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

  const formData = new FormData();

  formData.append('Id', this.user.id.toString());
  formData.append('FirstName', this.user.firstName);
  formData.append('LastName', this.user.lastName);
  formData.append('Email', this.user.email);
  formData.append('Phone', this.user.phone);
  formData.append('CountryId', this.user.country.id.toString());
  formData.append('RoleId', this.user.role.id.toString());

  if (this.selectedPicture) {
    formData.append('Picture', this.selectedPicture);
  }

  this.userService.putUpdateUser(formData, this.user.id).subscribe({
    next: () => console.log("Usuario actualizado"),
    error: (err) => console.error(err)
  });
}

}
