import { Component, OnInit } from '@angular/core';
import { ProductsService } from 'src/app/core/services/products.service';
import { CategoriesService } from 'src/app/core/services/categories.service';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ProcessingOverlayService } from 'src/app/core/services/processing-overlay.service';

@Component({
  selector: 'app-create-service',
  templateUrl: './create-service.component.html',
  styleUrls: ['./create-service.component.scss']
})
export class CreateServiceComponent implements OnInit {

  successMessage: string | null = null;

  loading = true;

  service: any = {
    name: '',
    description: '',
    price: null,
    categoryId: null,
    productType: 2,
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

    this.categoriesService
      .getCategories()
      .subscribe((categories: any[]) => {

        this.productsService
          .getProducts()
          .subscribe((items: any[]) => {

            const serviceCategoryNames = items
              .filter(
                item =>
                  item.productType?.name === 'Service'
              )
              .map(
                item =>
                  item.categoryName?.trim()
              );

            this.categoryList = categories.filter(
              cat =>
                serviceCategoryNames.includes(
                  cat.name?.trim()
                )
            );

            this.loading = false;
          });

      });
  }

  onFileChange(event: any) {

    const file = event.target.files[0];

    if (file) {

      this.service.picture = file;

      this.setImagePreview(file);
    }
  }

  onDrop(event: DragEvent) {

    event.preventDefault();

    this.isDragOver = false;

    if (
      event.dataTransfer &&
      event.dataTransfer.files.length > 0
    ) {

      const file = event.dataTransfer.files[0];

      this.service.picture = file;

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

      this.imagePreview =
        e.target?.result || null;
    };

    reader.readAsDataURL(file);
  }

  onSubmit() {

    const payload = {

      Name: this.service.name,

      Description: this.service.description,

      Price: this.service.price,

      Available: this.service.available,

      CategoryId: this.service.categoryId,

      ProductType: 2,

      Picture: this.service.picture
    };

    this.processingOverlay.show(
      'Se está creando el servicio'
    );

    this.productsService
      .addProduct(payload)
      .pipe(
        finalize(() => {

          this.processingOverlay.hide();
        })
      )
      .subscribe({

        next: () => {

          this.router.navigate([
            '/home/services/list'
          ]);
        }
      });
  }
}