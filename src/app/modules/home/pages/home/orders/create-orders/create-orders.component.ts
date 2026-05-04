import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OrdersService } from 'src/app/core/services/orders.service';
import { ProductsService } from 'src/app/core/services/products.service';
import { UsersService } from 'src/app/core/services/users.service';
import { CreateOrderRequest, CreateOrderItem } from 'src/app/core/models/orders';
import { finalize } from 'rxjs';
import { ProcessingOverlayService } from 'src/app/core/services/processing-overlay.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NotificationModalComponent } from 'src/app/components/notification-modal/notification-modal.component';

@Component({
  selector: 'app-create-orders',
  templateUrl: './create-orders.component.html',
  styleUrls: ['./create-orders.component.scss']
})
export class CreateOrdersComponent implements OnInit {
  // Datos del formulario
  selectedCustomerId: number | null = null;
  customerSearchQuery = '';
  customerDropdownOpen = false;
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
    private router: Router,
    private processingOverlay: ProcessingOverlayService,
    private modalService: NgbModal
  ) {}

  ngOnInit() {
    this.loadData();
  }

  get filteredCustomers(): any[] {
    const q = this.customerSearchQuery.trim().toLowerCase();
    if (!q || this.customers.length === 0) return [];
    return this.customers
      .filter((c) => {
        const full = `${c.firstName ?? ''} ${c.lastName ?? ''}`.toLowerCase();
        const email = (c.email ?? '').toLowerCase();
        return full.includes(q) || email.includes(q);
      })
      .slice(0, 40);
  }

  onCustomerSearchFocus() {
    this.customerDropdownOpen = true;
  }

  onCustomerSearchBlur() {
    setTimeout(() => {
      this.customerDropdownOpen = false;
    }, 180);
  }

  onCustomerSearchInput() {
    if (this.selectedCustomerId !== null) {
      this.selectedCustomerId = null;
    }
    this.customerDropdownOpen = true;
  }

  selectCustomer(customer: any, ev: MouseEvent) {
    ev.preventDefault();
    this.selectedCustomerId = customer.id;
    this.customerSearchQuery = '';
    this.customerDropdownOpen = false;
  }

  clearSelectedCustomer(ev?: MouseEvent) {
    ev?.preventDefault();
    this.selectedCustomerId = null;
    this.customerSearchQuery = '';
    this.customerDropdownOpen = false;
  }

  selectedCustomerLabel(): string {
    if (this.selectedCustomerId === null) return '';
    const c = this.customers.find((x) => x.id === this.selectedCustomerId);
    if (!c) return '';
    return `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() + ` — ${c.email ?? ''}`;
  }

  loadData() {
    // Cargar clientes
    this.usersService.getUsers().subscribe({
      next: (users) => {
        this.customers = users;
      },
      error: (err) => {
        this.openErrorModal(err, 'No se pudo cargar la lista de clientes.');
      }
    });

    // Cargar productos
    this.productsService.getProducts().subscribe({
      next: (products: any) => {
        this.products = products.filter((p: any) => p.available);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.openErrorModal(err, 'No se pudo cargar la lista de productos.');
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
    this.processingOverlay.show('Se está creando la orden');

    const orderRequest: CreateOrderRequest = {
      customerId: this.selectedCustomerId!,
      deliveryMethodId: this.selectedDeliveryMethodId,
      items: this.orderItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }))
    };

    console.log('Enviando orden:', orderRequest);

    this.ordersService
      .createOrder(orderRequest)
      .pipe(
        finalize(() => {
          this.submitting = false;
          this.processingOverlay.hide();
        })
      )
      .subscribe({
      next: (response) => {
        console.log('Orden creada exitosamente:', response);
        // Navegar a la lista de órdenes
        this.router.navigate(['/home/orders/view-orders']);
      },
      error: (err) => {
        this.openErrorModal(err, 'Error al crear la orden. Intente nuevamente.');
      }
    });
  }

  private openErrorModal(err: any, defaultMsg: string) {
    const message = err?.error?.detail || err?.error?.message || err?.error?.title || defaultMsg;
    const modalRef = this.modalService.open(NotificationModalComponent, { centered: true });
    modalRef.componentInstance.title = 'Error';
    modalRef.componentInstance.message = message;
    modalRef.componentInstance.type = 'error';
  }

  // Cancelar
  cancel() {
    this.router.navigate(['/home/orders/view-orders']);
  }
}
