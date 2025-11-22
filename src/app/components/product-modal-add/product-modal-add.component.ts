import { Component, EventEmitter, Output, Input } from '@angular/core';

@Component({
  selector: 'app-product-modal',
  templateUrl: './product-modal-add.component.html',
  styleUrls: ['./product-modal-add.component.scss']
})
export class ProductModalComponent {
  selectedFile: File | null = null;
  nameError = '';
  descriptionError = '';
  @Output() save = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  @Input() categories: { id: number, name: string }[] = [];
  @Input() productTypes: { id: number, name: string }[] = [];

  product = {
    name: '',
    description: '',
    price: 0,
    available: true,
    profileImageUrl: '',
    CategoryId: null,
    ProductType: null
  };

  onImageDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.handleImageFile(event.dataTransfer.files[0]);
    }
  }

  onImageSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleImageFile(input.files[0]);
    }
  }

  handleImageFile(file: File) {
  this.selectedFile = file; 
  const reader = new FileReader();
  reader.onload = (e: any) => {
    this.product.profileImageUrl = e.target.result;
  };
  reader.readAsDataURL(file);
}

  onSave() {
    // Verificar el objeto product antes de armar el payload
    console.log('Objeto product:', this.product);
    const payload: any = {
      Name: this.product.name?.trim() ?? '',
      Description: this.product.description?.trim() ?? '',
      Price: this.product.price !== undefined && this.product.price !== null && this.product.price > 0 ? this.product.price : 1,
      Available: this.product.available !== undefined && this.product.available !== null ? this.product.available : false,
      CategoryId: this.product.CategoryId !== undefined && this.product.CategoryId !== null ? this.product.CategoryId : '',
      ProductType: this.product.ProductType !== undefined && this.product.ProductType !== null ? this.product.ProductType : '',
      Picture: this.selectedFile
    };
    console.log('Payload a guardar:', payload);
    this.save.emit(payload);
  }

  onClose() {
    this.close.emit();
  }
}