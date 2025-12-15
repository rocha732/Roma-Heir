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
