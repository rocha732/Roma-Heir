import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { CategoriesService } from 'src/app/core/services/categories.service';
import { ProcessingOverlayService } from 'src/app/core/services/processing-overlay.service';
import { ProductsService } from 'src/app/core/services/products.service';

import { NotificationModalComponent } from 'src/app/components/notification-modal/notification-modal.component';

@Component({
  selector: 'app-service-stylists-edit',
  templateUrl: './service-stylists-edit.component.html',
  styleUrls: ['./service-stylists-edit.component.scss'],
})
export class ServiceStylistsEditComponent implements OnInit {

  service: any = null;

  allServices: any[] = [];

  selectedServiceId: number | null = null;

  categoryList: { id: number; name: string }[] = [];

  isDragOver = false;

  imagePreview: string | ArrayBuffer | null = null;

  successMessage: string | null = null;

  loading = true;

  constructor(
    private route: ActivatedRoute,
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private router: Router,
    private processingOverlay: ProcessingOverlayService,
    private modalService: NgbModal
  ) {}

  ngOnInit() {

    let categoriesLoaded = false;
    let servicesLoaded = false;

    this.categoriesService.getCategories().subscribe(categories => {

      this.categoryList = categories;

      if (this.service?.categoryId == null && this.service?.categoryName) {
        this.service.categoryId = this.getCategoryIdByName(this.service.categoryName);
      }

      categoriesLoaded = true;

      if (categoriesLoaded && servicesLoaded) {
        this.loading = false;
      }
    });

    this.productsService.getProducts().subscribe((products: any[]) => {

      this.allServices = products.filter((p: any) =>
        String(p.productType?.name || '')
          .toLowerCase()
          .includes('service')
      );

      const id = this.route.snapshot.paramMap.get('id');

      if (id) {
        this.setServiceToEdit(id);
      }

      servicesLoaded = true;

      if (categoriesLoaded && servicesLoaded) {
        this.loading = false;
      }
    });
  }

  private openErrorModal(err: any, defaultMsg: string) {

    const message =
      err?.error?.detail ||
      err?.error?.message ||
      err?.error?.title ||
      defaultMsg;

    const modalRef = this.modalService.open(
      NotificationModalComponent,
      { centered: true }
    );

    modalRef.componentInstance.title = 'Error';

    modalRef.componentInstance.message = message;

    modalRef.componentInstance.type = 'error';
  }

  onServiceSelect() {

    if (this.selectedServiceId) {
      this.setServiceToEdit(this.selectedServiceId);
    } else {
      this.service = null;
      this.imagePreview = null;
    }
  }

  private getCategoryIdByName(
    name: string | undefined | null
  ): number | null {

    if (!name) return null;

    const foundCategory = this.categoryList.find(
      cat => cat.name === name
    );

    return foundCategory ? foundCategory.id : null;
  }

  setServiceToEdit(id: number | string) {

    const found = this.allServices.find(
      (s: any) => String(s.id) === String(id)
    );

    if (found) {

      const categoryId =
        found.categoryId ??
        this.getCategoryIdByName(found.categoryName);

      this.service = {
        id: found.id,
        name: found.name,
        description: found.description,
        price: found.price,
        categoryId: categoryId,
        categoryName: found.categoryName,
        productType: found.productType?.id ?? 2,
        available: found.available,
        picture: null
      };

      this.imagePreview =
        found.profileImageUrl || null;

    } else {

      this.service = null;

      this.imagePreview = null;
    }
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
      this.imagePreview = e.target?.result || null;
    };

    reader.readAsDataURL(file);
  }

  actualizarServicio() {

    if (!this.service || !this.service.id) return;

    const payload: any = {
      Name: this.service.name,
      Description: this.service.description,
      Price: Number(this.service.price),
      Available: this.service.available,
      CategoryId: Number(this.service.categoryId),
      ProductType: 2
    };

    if (this.service.picture) {
      payload.Picture = this.service.picture;
    }

    this.processingOverlay.show(
      'Estamos actualizando el servicio'
    );

    this.productsService
      .updateProduct(this.service.id, payload)
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
        },

        error: (err) => {

          this.openErrorModal(
            err,
            'No se pudo actualizar el servicio.'
          );
        }
      });
  }
}