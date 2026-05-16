import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ProductsService } from 'src/app/core/services/products.service';
import { CategoriesService } from 'src/app/core/services/categories.service';
import { finalize } from 'rxjs';
import { ProcessingOverlayService } from 'src/app/core/services/processing-overlay.service';

@Component({
  selector: 'app-view-products',
  templateUrl: './view-products.component.html',
  styleUrls: ['./view-products.component.scss']
})
export class ViewProductsComponent {
  products: any[] = [];
  filteredProducts: any[] = [];
  searchTerm: string = '';
  showModal: boolean = false;
  categoryList: { id: number, name: string }[] = [];
  selectedCategory: string | null = null;
  loading: boolean = true;

  constructor(
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private router: Router,
    private processingOverlay: ProcessingOverlayService
  ) {
    // Cargar categorías desde el backend
    this.categoriesService.getCategories().subscribe((categories) => {
      this.categoryList = categories;
    });
    // Cargar solo productos (filtramos por productType.name que contenga 'Product')
    this.productsService.getProducts().subscribe((products: any) => {
      const productItems = products.filter((p: any) =>
        String(p.productType?.name || '').toLowerCase().includes('product')
      );
      this.products = productItems;
      this.filteredProducts = productItems;
      this.loading = false;
    });
  }

  // Estadísticas
  get totalProducts(): number {
    return this.products.length;
  }

  get availableProducts(): number {
    return this.products.filter(p => p.available).length;
  }

  get unavailableProducts(): number {
    return this.products.filter(p => !p.available).length;
  }

  get totalCategories(): number {
    return this.categoryList.length;
  }

  // Obtener productos por categoría
  get productsByCategory(): { name: string, count: number }[] {
    const categoryCount = new Map<string, number>();
    this.products.forEach(p => {
      const cat = p.categoryName || 'Sin categoría';
      categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
    });
    return Array.from(categoryCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  get averagePrice(): number {
    if (this.products.length === 0) return 0;
    const total = this.products.reduce((sum, p) => sum + (p.price || 0), 0);
    return total / this.products.length;
  }

  get totalInventoryValue(): number {
    return this.products.reduce((sum, p) => sum + (p.price || 0), 0);
  }

  onSearch(term: string) {
    this.searchTerm = term.toLowerCase();
    this.applyFilters();
  }

  onFilterChange() {
    this.applyFilters();
  }

  applyFilters() {
    this.filteredProducts = this.products.filter(product => {
      const name = (product.name || '').toLowerCase();
      const category = (product.categoryName || '').toLowerCase();
      const matchesSearch = !this.searchTerm || name.includes(this.searchTerm) || category.includes(this.searchTerm);
      // Filtrar por categoryName en vez de categoryId
      const matchesCategory = this.selectedCategory == null || product.categoryName === this.selectedCategory;
      const matchesType = String(product.productType?.name || '').toLowerCase().includes('product');
      return matchesSearch && matchesCategory && matchesType;
    });
    console.log('Filtro aplicado:', {
      searchTerm: this.searchTerm,
      selectedCategory: this.selectedCategory,
      filteredProducts: this.filteredProducts
    });
  }

  openModal() {
    this.showModal = true;
  }

  onModalSave(product: any) {
    // Mapear a mayúscula inicial para el backend y usar ids
    const payload = {
      Name: product.name,
      Description: product.description,
      Price: product.price,
      Available: product.available,
      ProfileImageUrl: product.profileImageUrl,
      CategoryId: Number(product.CategoryId),
      ProductType: Number(product.ProductType)
    };
    this.processingOverlay.show('Se está creando el producto');
    this.productsService
      .addProduct(payload)
      .pipe(
        finalize(() => {
          this.processingOverlay.hide();
        })
      )
      .subscribe(() => {
        // Recargar la lista de productos para obtener la URL real de la imagen
        this.productsService.getProducts().subscribe((products: any) => {
          this.products = products;
          this.filteredProducts = products;
          this.showModal = false;
        });
      });
  }

  onModalClose() {
    this.showModal = false;
  }

  onEditProduct(id: number) {
    if (id !== undefined && id !== null) {
      this.router.navigate(['/home/products/edit-product', id]);
    }
  }
}
