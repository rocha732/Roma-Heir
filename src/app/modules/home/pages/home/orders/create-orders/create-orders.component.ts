import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OrdersService } from 'src/app/core/services/orders.service';
import { ProductsService } from 'src/app/core/services/products.service';
import { UsersService } from 'src/app/core/services/users.service';
import { CreateOrderRequest, CreateOrderItem } from 'src/app/core/models/orders';

@Component({
  selector: 'app-create-orders',
  templateUrl: './create-orders.component.html',
  styleUrls: ['./create-orders.component.scss']
})
export class CreateOrdersComponent implements OnInit {
  // Datos del formulario
  selectedCustomerId: number | null = null;
  selectedDeliveryMethodId: number = 1; // Default: 1
  orderItems: { productId: number; quantity: number; productName: string; price: number }[] = [];

  // Listas para selects
  customers: any[] = [];
  products: any[] = [];
  deliveryMethods = [
    { id: 1, name: 'Recojo en tienda' },
    { id: 2, name: 'Delivery' }
  ];

  // Estado
  loading = true;
  submitting = false;
  error: string | null = null;

  // Producto a agregar
  selectedProductId: number | null = null;
  productQuantity: number = 1;

  constructor(
    private ordersService: OrdersService,
    private productsService: ProductsService,
    private usersService: UsersService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    // Cargar clientes
    this.usersService.getUsers().subscribe({
      next: (users) => {
        this.customers = users;
      },
      error: (err) => {
        console.error('Error cargando clientes:', err);
      }
    });

    // Cargar productos
    this.productsService.getProducts().subscribe({
      next: (products: any) => {
        this.products = products.filter((p: any) => p.available);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando productos:', err);
        this.loading = false;
      }
    });
  }

  // Agregar producto a la orden
  addProduct() {
    if (!this.selectedProductId || this.productQuantity < 1) return;

    // Verificar si ya existe
    const existingIndex = this.orderItems.findIndex(item => item.productId === this.selectedProductId);
    
    if (existingIndex >= 0) {
      // Actualizar cantidad
      this.orderItems[existingIndex].quantity += this.productQuantity;
    } else {
      // Agregar nuevo
      const product = this.products.find(p => p.id === this.selectedProductId);
      if (product) {
        this.orderItems.push({
          productId: product.id,
          quantity: this.productQuantity,
          productName: product.name,
          price: product.price
        });
      }
    }

    // Reset
    this.selectedProductId = null;
    this.productQuantity = 1;
  }

  // Eliminar producto de la orden
  removeProduct(index: number) {
    this.orderItems.splice(index, 1);
  }

  // Actualizar cantidad
  updateQuantity(index: number, quantity: number) {
    if (quantity < 1) {
      this.removeProduct(index);
    } else {
      this.orderItems[index].quantity = quantity;
    }
  }

  // Calcular total
  get orderTotal(): number {
    return this.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  // Calcular total de items
  get totalItems(): number {
    return this.orderItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  // Validar formulario
  get isFormValid(): boolean {
    return this.selectedCustomerId !== null && 
           this.selectedDeliveryMethodId !== null && 
           this.orderItems.length > 0;
  }

  // Enviar orden
  submitOrder() {
    if (!this.isFormValid) return;

    this.submitting = true;
    this.error = null;

    const orderRequest: CreateOrderRequest = {
      customerId: this.selectedCustomerId!,
      deliveryMethodId: this.selectedDeliveryMethodId,
      items: this.orderItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }))
    };

    console.log('Enviando orden:', orderRequest);

    this.ordersService.createOrder(orderRequest).subscribe({
      next: (response) => {
        console.log('Orden creada exitosamente:', response);
        this.submitting = false;
        // Navegar a la lista de órdenes
        this.router.navigate(['/home/orders/view-orders']);
      },
      error: (err) => {
        console.error('Error creando orden:', err);
        console.error('Error details:', err.error);
        this.error = err.error?.message || err.error?.title || 'Error al crear la orden. Intente nuevamente.';
        this.submitting = false;
      }
    });
  }

  // Cancelar
  cancel() {
    this.router.navigate(['/home/orders/view-orders']);
  }
}
