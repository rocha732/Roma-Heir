import { Component, OnInit } from '@angular/core';
import { ProductsService } from 'src/app/core/services/products.service';
import { CategoriesService } from 'src/app/core/services/categories.service';

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
    productType: null,
    available: true,
    picture: null
  };
  categoryList: { id: number, name: string }[] = [];
  productTypeList: { id: number, name: string }[] = [];
  isDragOver = false;
  imagePreview: string | ArrayBuffer | null = null;

  constructor(
    private productsService: ProductsService,
    private categoriesService: CategoriesService
  ) {}

  ngOnInit() {
    let categoriesLoaded = false;
    let typesLoaded = false;

    // Obtener categorías
    this.categoriesService.getCategories().subscribe(categories => {
      this.categoryList = categories;
      categoriesLoaded = true;
      if (categoriesLoaded && typesLoaded) this.loading = false;
    });
    
    // Obtener tipos de producto únicos desde los productos existentes
    this.productsService.getProducts().subscribe((products: any) => {
      const typeMap = new Map<number, { id: number, name: string }>();
      products.forEach((p: any) => {
        if (p.productType && p.productType.id && !typeMap.has(p.productType.id)) {
          typeMap.set(p.productType.id, { id: p.productType.id, name: p.productType.name });
        }
      });
      this.productTypeList = Array.from(typeMap.values());
      typesLoaded = true;
      if (categoriesLoaded && typesLoaded) this.loading = false;
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
      ProductType: this.product.productType,
      Picture: this.product.picture
    };
    this.productsService.addProduct(payload).subscribe(() => {
      this.successMessage = '¡Producto agregado correctamente!';
      // Limpiar formulario
      this.product = {
        name: '',
        description: '',
        price: null,
        categoryId: null,
        productType: null,
        available: true,
        picture: null
      };
      this.imagePreview = null;
      setTimeout(() => {
        this.successMessage = null;
      }, 3000);
    });
  }
}
