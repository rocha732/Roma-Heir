import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProductsService } from 'src/app/core/services/products.service';
import { CategoriesService } from 'src/app/core/services/categories.service';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ProcessingOverlayService } from 'src/app/core/services/processing-overlay.service';

@Component({
  selector: 'app-edit-product',
  templateUrl: './edit-product.component.html',
  styleUrls: ['./edit-product.component.scss']
})
export class EditProductComponent implements OnInit {
  product: any = null;
  allProducts: any[] = [];
  selectedProductId: number | null = null;
  categoryList: { id: number, name: string }[] = [];
  isDragOver = false;
  imagePreview: string | ArrayBuffer | null = null;
  successMessage: string | null = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private router: Router,
    private processingOverlay: ProcessingOverlayService
  ) {}

  ngOnInit() {
    let categoriesLoaded = false;
    let productsLoaded = false;

    this.categoriesService.getCategories().subscribe(categories => {
      this.categoryList = categories;
      if (this.product?.categoryId == null && this.product?.categoryName) {
        this.product.categoryId = this.getCategoryIdByName(this.product.categoryName);
      }
      categoriesLoaded = true;
      if (categoriesLoaded && productsLoaded) this.loading = false;
    });
    
    this.productsService.getProducts().subscribe((products: any) => {
      this.allProducts = products.filter((p: any) =>
        String(p.productType?.name || '').toLowerCase().includes('product')
      );
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.setProductToEdit(id);
      }
      productsLoaded = true;
      if (categoriesLoaded && productsLoaded) this.loading = false;
    });
  }

  onProductSelect() {
    if (this.selectedProductId) {
      this.setProductToEdit(this.selectedProductId);
    } else {
      this.product = null;
      this.imagePreview = null;
    }
  }

  private getCategoryIdByName(name: string | undefined | null): number | null {
    if (!name) return null;
    const foundCategory = this.categoryList.find(cat => cat.name === name);
    return foundCategory ? foundCategory.id : null;
  }

  setProductToEdit(id: number | string) {
    const found = this.allProducts.find((p: any) => String(p.id) === String(id));
    if (found) {
      const categoryId = found.categoryId ?? this.getCategoryIdByName(found.categoryName);

      this.product = {
        id: found.id,
        name: found.name,
        description: found.description,
        price: found.price,
        categoryId: categoryId,
        categoryName: found.categoryName,
        productType: found.productType?.id ?? found.productTypeId ?? 1,
        available: found.available,
        picture: null
      };
      if (found.profileImageUrl) {
        this.imagePreview = found.profileImageUrl;
      } else {
        this.imagePreview = null;
      }
    } else {
      this.product = null;
      this.imagePreview = null;
    }
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

  actualizarProducto() {
    if (!this.product || !this.product.id) return;
    // Usar la misma estructura que addProduct
    const payload: any = {
      Name: this.product.name,
      Description: this.product.description,
      Price: Number(this.product.price),
      Available: this.product.available,
      CategoryId: Number(this.product.categoryId),
      ProductType: Number(this.product.productType)
    };
    if (this.product.picture) {
      payload.Picture = this.product.picture;
    }
    console.log('PAYLOAD FINAL', payload);
    this.processingOverlay.show('Estamos actualizando el producto');
    this.productsService
      .updateProduct(this.product.id, payload)
      .pipe(
        finalize(() => {
          this.processingOverlay.hide();
        })
      )
      .subscribe({
      next: () => {
        this.router.navigate(['/home/products/view-products']);
      },
      error: (err) => {
        console.error('Error del servicio:', err);
      }
    });
  }
}
