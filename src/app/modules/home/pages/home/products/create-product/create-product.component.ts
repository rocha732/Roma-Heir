import { Component, OnInit } from '@angular/core';
import { ProductsService } from 'src/app/core/services/products.service';
import { CategoriesService } from 'src/app/core/services/categories.service';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ProcessingOverlayService } from 'src/app/core/services/processing-overlay.service';

@Component({
  selector: 'app-create-product',
  templateUrl: './create-product.component.html',
  styleUrls: ['./create-product.component.scss']
})
export class CreateProductComponent implements OnInit {
  successMessage: string | null = null;
  loading = true;
  product: any = {
    name: '',
    description: '',
    price: null,
    categoryId: null,
    productType: 1,
    available: true,
    picture: null
  };
  categoryList: { id: number, name: string }[] = [];
  isDragOver = false;
  imagePreview: string | ArrayBuffer | null = null;

  constructor(
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private router: Router,
    private processingOverlay: ProcessingOverlayService
  ) {}

  ngOnInit() {
    this.categoriesService.getCategories().subscribe(categories => {
      this.categoryList = categories;
      this.loading = false;
    });
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.product.picture = file;
      this.setImagePreview(file);
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.product.picture = file;
      this.setImagePreview(file);
    }
  }

  onDragEnter(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  setImagePreview(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview = e.target?.result || null;
    };
    reader.readAsDataURL(file);
  }

  onSubmit() {
    const payload = {
      Name: this.product.name,
      Description: this.product.description,
      Price: this.product.price,
      Available: this.product.available,
      CategoryId: this.product.categoryId,
      ProductType: 1,
      Picture: this.product.picture
    };
    this.processingOverlay.show('Se está creando el producto');
    this.productsService
      .addProduct(payload)
      .pipe(
        finalize(() => {
          this.processingOverlay.hide();
        })
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/home/products/view-products']);
        },
      });
  }
}
