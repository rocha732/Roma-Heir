import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ProductsService } from 'src/app/core/services/products.service';
import { CategoriesService } from 'src/app/core/services/categories.service';

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
  productTypeList: { id: number, name: string }[] = [];
  selectedCategory: string | null = null;
  selectedProductType: number | null = null;
  loading: boolean = true;

  constructor(
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private router: Router
  ) {
    // Cargar categorías desde el backend
    this.categoriesService.getCategories().subscribe((categories) => {
      this.categoryList = categories;
    });
    // Cargar productos y tipos de producto
    this.productsService.getProducts().subscribe((products: any) => {
      this.products = products;
      this.filteredProducts = products;
      this.loading = false;
      // Construir lista de tipos de producto únicos como objetos {id, name}
      const typeMap = new Map<number, { id: number, name: string }>();
      products.forEach((p: any) => {
        if (p.productType && p.productType.id && !typeMap.has(p.productType.id)) {
          typeMap.set(p.productType.id, { id: p.productType.id, name: p.productType.name });
        }
      });
      this.productTypeList = Array.from(typeMap.values());
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

  get totalProductTypes(): number {
    return this.productTypeList.length;
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

  // Obtener productos por tipo
  get productsByType(): { name: string, count: number }[] {
    const typeCount = new Map<string, number>();
    this.products.forEach(p => {
      const typeName = p.productType?.name || 'Sin tipo';
      typeCount.set(typeName, (typeCount.get(typeName) || 0) + 1);
    });
    return Array.from(typeCount.entries())
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
      const matchesType = this.selectedProductType == null || (product.productType && product.productType.id == this.selectedProductType);
      return matchesSearch && matchesCategory && matchesType;
    });
    console.log('Filtro aplicado:', {
      searchTerm: this.searchTerm,
      selectedCategory: this.selectedCategory,
      selectedProductType: this.selectedProductType,
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
    this.productsService.addProduct(payload).subscribe(() => {
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
