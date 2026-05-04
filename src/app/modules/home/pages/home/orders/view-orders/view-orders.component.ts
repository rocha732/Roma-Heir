
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { OrdersService } from 'src/app/core/services/orders.service';
import { ProductsService } from 'src/app/core/services/products.service';
import { Orders } from 'src/app/core/models/orders';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { finalize } from 'rxjs';
import { ProcessingOverlayService } from 'src/app/core/services/processing-overlay.service';

@Component({
  selector: 'app-view-orders',
  templateUrl: './view-orders.component.html',
  styleUrls: ['./view-orders.component.scss']
})
export class ViewOrdersComponent implements OnInit {
  orders: Orders[] = [];
  filteredOrders: Orders[] = [];
  loading = true;
  error: string | null = null;

  // Filtros
  searchClient: string = '';
  selectedStatus: string | null = null;
  filterDate: string = '';

  // Lista de estados predeterminados
  statusList: string[] = ['Pendiente', 'En proceso', 'Completado', 'Cancelado'];

  // Control de carga de detalles
  loadingDetailsId: number | null = null;

  // Control de pago
  payingOrderId: number | null = null;

  // Mapa de productos para obtener nombre por ID
  productsMap: Map<number, string> = new Map();

  // Logo para PDF
  logoBase64: string = '';

  constructor(
    private ordersService: OrdersService,
    private productsService: ProductsService,
    private router: Router,
    private processingOverlay: ProcessingOverlayService
  ) {}

  ngOnInit() {
    this.loadData();
    this.loadLogo();
    
    // Recargar datos cuando se navega a esta página
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      if (event.url.includes('view-orders')) {
        this.loadData();
      }
    });
  }

  loadData() {
    this.loading = true;
    
    // Cargar productos para el mapa de nombres
    this.productsService.getProducts().subscribe({
      next: (products: any) => {
        products.forEach((p: any) => {
          this.productsMap.set(p.id, p.name);
        });
      }
    });

    // Cargar órdenes
    this.ordersService.getOrders().subscribe({
      next: (orders) => {
        console.log('Órdenes recibidas:', orders);
        console.log('Primera orden - customer:', orders[0]?.customer);
        this.orders = orders;
        this.filteredOrders = orders;
        this.loading = false;
        // Agregar estados adicionales que vengan de las órdenes
        const statusSet = new Set<string>(this.statusList);
        orders.forEach(o => {
          if (o.orderStatus && !statusSet.has(o.orderStatus)) {
            statusSet.add(o.orderStatus);
          }
        });
        this.statusList = Array.from(statusSet);
      },
      error: (err) => {
        this.error = 'No se pudieron cargar las órdenes.';
        this.loading = false;
      }
    });
  }

  getProductName(productId: number): string {
    return this.productsMap.get(productId) || `Producto #${productId}`;
  }

  // Estadísticas
  get totalOrders(): number {
    return this.orders.length;
  }

  get paidOrders(): number {
    return this.orders.filter(o => o.paid).length;
  }

  get unpaidOrders(): number {
    return this.orders.filter(o => !o.paid).length;
  }

  get totalRevenue(): number {
    return this.orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }

  get paidRevenue(): number {
    return this.orders.filter(o => o.paid).reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }

  getOrdersByStatus(status: string): number {
    return this.orders.filter(o => (o.orderStatus || 'Pendiente') === status).length;
  }

  onFilterChange() {
    this.applyFilters();
  }

  applyFilters() {
    this.filteredOrders = this.orders.filter(order => {
      // Filtro por cliente
      const clientName = (order.customer?.fullName || '').toLowerCase();
      const matchesClient = !this.searchClient || clientName.includes(this.searchClient.toLowerCase());

      // Filtro por estado (tratar null/undefined como 'Pendiente')
      const orderStatus = order.orderStatus || 'Pendiente';
      const matchesStatus = this.selectedStatus == null || orderStatus === this.selectedStatus;

      // Filtro por fecha (comparar solo año, mes y día)
      let matchesDate = true;
      if (this.filterDate) {
        const orderDate = new Date(order.createdAt);
        const orderDateOnly = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
        
        const [year, month, day] = this.filterDate.split('-').map(Number);
        const selectedDate = new Date(year, month - 1, day);
        matchesDate = orderDateOnly.getTime() === selectedDate.getTime();
      }

      return matchesClient && matchesStatus && matchesDate;
    });
  }

  clearFilters() {
    this.searchClient = '';
    this.selectedStatus = null;
    this.filterDate = '';
    this.filteredOrders = this.orders;
  }

  toggleDetails(order: Orders) {
    // Si ya está mostrando detalles, ocultarlos
    if (order.showDetails) {
      order.showDetails = false;
      return;
    }

    // Si ya tiene items cargados, solo mostrar
    if (order.items && order.items.length > 0) {
      order.showDetails = true;
      return;
    }

    // Cargar detalles desde la API
    this.loadingDetailsId = order.id;
    this.ordersService.getOrderDetails(order.id).subscribe({
      next: (details) => {
        order.items = details.items;
        // Obtener datos del cliente desde el detalle
        if (details.customer) {
          order.customer = details.customer;
        }
        order.showDetails = true;
        this.loadingDetailsId = null;
      },
      error: (err) => {
        console.error('Error al cargar detalles:', err);
        order.showDetails = true; // Mostrar igual para ver mensaje de "no hay productos"
        this.loadingDetailsId = null;
      }
    });
  }

  markAsPaid(order: Orders) {
    this.payingOrderId = order.id;
    this.processingOverlay.show('Estamos actualizando la orden');
    this.ordersService
      .updatePayment(order.id)
      .pipe(
        finalize(() => {
          this.processingOverlay.hide();
          this.payingOrderId = null;
        })
      )
      .subscribe({
      next: () => {
        order.paid = true;
        order.paidAt = new Date();
      },
      error: (err) => {
        console.error('Error al actualizar pago:', err);
        alert('Error al procesar el pago. Intente nuevamente.');
      }
    });
  }

  // Cargar logo para PDF
  loadLogo() {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        this.logoBase64 = canvas.toDataURL('image/png');
      }
    };
    img.src = 'assets/ico-logo.png';
  }

  // Generar PDF de Boleta/Orden de Compra
  generatePDF(order: Orders, type: 'boleta' | 'orden' = 'boleta') {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Colores
    const primaryColor: [number, number, number] = [20, 20, 20]; // Negro
    const darkColor: [number, number, number] = [51, 51, 51];
    const lightGray: [number, number, number] = [245, 245, 245];
    
    // Header con nombre de empresa
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 38, 'F');
    
    // Nombre de la empresa
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('ROMA HAIR', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Productos de belleza y cuidado personal', pageWidth / 2, 25, { align: 'center' });
    doc.text('www.romahair.com | +51 999 999 999', pageWidth / 2, 32, { align: 'center' });
    
    // Título del documento
    const docTitle = type === 'boleta' ? 'BOLETA DE VENTA' : 'ORDEN DE COMPRA';
    doc.setTextColor(...darkColor);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(docTitle, pageWidth / 2, 48, { align: 'center' });
    
    // Número de documento
    doc.setFillColor(...lightGray);
    doc.roundedRect(pageWidth - 65, 40, 55, 15, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.text(`N° ${order.id.toString().padStart(6, '0')}`, pageWidth - 37, 49, { align: 'center' });
    
    // Información del cliente y orden
    let yPos = 58;
    
    // Caja de información
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, yPos - 5, pageWidth - 30, 45, 3, 3, 'FD');
    
    doc.setTextColor(...darkColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL CLIENTE', 20, yPos + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Cliente: ${order.customer?.fullName || 'N/A'}`, 20, yPos + 15);
    doc.text(`Teléfono: ${order.customer?.phone || 'N/A'}`, 20, yPos + 23);
    doc.text(`Email: ${order.customer?.email || 'N/A'}`, 20, yPos + 31);
    
    // Información de la orden (lado derecho)
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DE LA ORDEN', pageWidth - 85, yPos + 5);
    
    doc.setFont('helvetica', 'normal');
    const orderDate = new Date(order.createdAt);
    doc.text(`Fecha: ${orderDate.toLocaleDateString('es-PE')}`, pageWidth - 85, yPos + 15);
    doc.text(`Estado: ${order.orderStatus || 'Pendiente'}`, pageWidth - 85, yPos + 23);
    doc.text(`Entrega: ${order.deliveryMethod || 'N/A'}`, pageWidth - 85, yPos + 31);
    
    yPos += 55;
    
    // Tabla de productos
    const tableData = (order.items || []).map((item, index) => [
      (index + 1).toString(),
      this.getProductName(item.productId),
      item.quantity.toString(),
      `S/. ${item.price?.toFixed(2) || '0.00'}`,
      `S/. ${item.subtotal?.toFixed(2) || '0.00'}`
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Producto', 'Cant.', 'Precio Unit.', 'Subtotal']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'left', cellWidth: 'auto' },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 35 },
        4: { halign: 'right', cellWidth: 35 }
      },
      styles: {
        fontSize: 9,
        cellPadding: 5
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      }
    });
    
    // Obtener posición Y después de la tabla
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Caja de totales
    const totalsWidth = 80;
    const totalsX = pageWidth - totalsWidth - 15;
    
    doc.setFillColor(...lightGray);
    doc.roundedRect(totalsX, finalY, totalsWidth, 35, 3, 3, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(...darkColor);
    
    const subtotal = order.totalAmount || 0;
    const igv = subtotal * 0.18;
    const total = subtotal;
    
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', totalsX + 5, finalY + 10);
    doc.text(`S/. ${(subtotal / 1.18).toFixed(2)}`, totalsX + totalsWidth - 5, finalY + 10, { align: 'right' });
    
    doc.text('IGV (18%):', totalsX + 5, finalY + 18);
    doc.text(`S/. ${(subtotal - subtotal / 1.18).toFixed(2)}`, totalsX + totalsWidth - 5, finalY + 18, { align: 'right' });
    
    doc.setDrawColor(200, 200, 200);
    doc.line(totalsX + 5, finalY + 22, totalsX + totalsWidth - 5, finalY + 22);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', totalsX + 5, finalY + 30);
    doc.setTextColor(...primaryColor);
    doc.text(`S/. ${total.toFixed(2)}`, totalsX + totalsWidth - 5, finalY + 30, { align: 'right' });
    
    // Estado de pago
    const paymentY = finalY + 45;
    if (order.paid) {
      doc.setFillColor(34, 197, 94); // Verde
      doc.roundedRect(15, paymentY, 60, 15, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('✓ PAGADO', 45, paymentY + 10, { align: 'center' });
      
      if (order.paidAt) {
        doc.setTextColor(...darkColor);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const paidDate = new Date(order.paidAt);
        doc.text(`Fecha de pago: ${paidDate.toLocaleDateString('es-PE')}`, 15, paymentY + 22);
      }
    } else {
      doc.setFillColor(239, 68, 68); // Rojo
      doc.roundedRect(15, paymentY, 70, 15, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('PENDIENTE DE PAGO', 50, paymentY + 10, { align: 'center' });
    }
    
    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);
    
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Gracias por su compra', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Documento generado el ${new Date().toLocaleDateString('es-PE')} a las ${new Date().toLocaleTimeString('es-PE')}`, pageWidth / 2, footerY + 6, { align: 'center' });
    
    // Guardar PDF
    const fileName = type === 'boleta' 
      ? `boleta_${order.id.toString().padStart(6, '0')}.pdf`
      : `orden_compra_${order.id.toString().padStart(6, '0')}.pdf`;
    
    doc.save(fileName);
  }

  // Previsualizar PDF en nueva ventana
  previewPDF(order: Orders, type: 'boleta' | 'orden' = 'boleta') {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Colores
    const primaryColor: [number, number, number] = [20, 20, 20]; // Negro
    const darkColor: [number, number, number] = [51, 51, 51];
    const lightGray: [number, number, number] = [245, 245, 245];
    
    // Header con nombre de empresa
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 38, 'F');
    
    // Nombre de la empresa
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('ROMA HAIR', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Productos de belleza y cuidado personal', pageWidth / 2, 25, { align: 'center' });
    doc.text('www.romahair.com | +51 999 999 999', pageWidth / 2, 32, { align: 'center' });
    
    const docTitle = type === 'boleta' ? 'BOLETA DE VENTA' : 'ORDEN DE COMPRA';
    doc.setTextColor(...darkColor);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(docTitle, pageWidth / 2, 48, { align: 'center' });
    
    doc.setFillColor(...lightGray);
    doc.roundedRect(pageWidth - 65, 40, 55, 15, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.text(`N° ${order.id.toString().padStart(6, '0')}`, pageWidth - 37, 49, { align: 'center' });
    
    let yPos = 58;
    
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, yPos - 5, pageWidth - 30, 45, 3, 3, 'FD');
    
    doc.setTextColor(...darkColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL CLIENTE', 20, yPos + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Cliente: ${order.customer?.fullName || 'N/A'}`, 20, yPos + 15);
    doc.text(`Teléfono: ${order.customer?.phone || 'N/A'}`, 20, yPos + 23);
    doc.text(`Email: ${order.customer?.email || 'N/A'}`, 20, yPos + 31);
    
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DE LA ORDEN', pageWidth - 85, yPos + 5);
    
    doc.setFont('helvetica', 'normal');
    const orderDate = new Date(order.createdAt);
    doc.text(`Fecha: ${orderDate.toLocaleDateString('es-PE')}`, pageWidth - 85, yPos + 15);
    doc.text(`Estado: ${order.orderStatus || 'Pendiente'}`, pageWidth - 85, yPos + 23);
    doc.text(`Entrega: ${order.deliveryMethod || 'N/A'}`, pageWidth - 85, yPos + 31);
    
    yPos += 55;
    
    const tableData = (order.items || []).map((item, index) => [
      (index + 1).toString(),
      this.getProductName(item.productId),
      item.quantity.toString(),
      `S/. ${item.price?.toFixed(2) || '0.00'}`,
      `S/. ${item.subtotal?.toFixed(2) || '0.00'}`
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Producto', 'Cant.', 'Precio Unit.', 'Subtotal']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'left', cellWidth: 'auto' },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 35 },
        4: { halign: 'right', cellWidth: 35 }
      },
      styles: {
        fontSize: 9,
        cellPadding: 5
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    const totalsWidth = 80;
    const totalsX = pageWidth - totalsWidth - 15;
    
    doc.setFillColor(...lightGray);
    doc.roundedRect(totalsX, finalY, totalsWidth, 35, 3, 3, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(...darkColor);
    
    const subtotal = order.totalAmount || 0;
    
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', totalsX + 5, finalY + 10);
    doc.text(`S/. ${(subtotal / 1.18).toFixed(2)}`, totalsX + totalsWidth - 5, finalY + 10, { align: 'right' });
    
    doc.text('IGV (18%):', totalsX + 5, finalY + 18);
    doc.text(`S/. ${(subtotal - subtotal / 1.18).toFixed(2)}`, totalsX + totalsWidth - 5, finalY + 18, { align: 'right' });
    
    doc.setDrawColor(200, 200, 200);
    doc.line(totalsX + 5, finalY + 22, totalsX + totalsWidth - 5, finalY + 22);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', totalsX + 5, finalY + 30);
    doc.setTextColor(...primaryColor);
    doc.text(`S/. ${subtotal.toFixed(2)}`, totalsX + totalsWidth - 5, finalY + 30, { align: 'right' });
    
    const paymentY = finalY + 45;
    if (order.paid) {
      doc.setFillColor(34, 197, 94);
      doc.roundedRect(15, paymentY, 60, 15, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('✓ PAGADO', 45, paymentY + 10, { align: 'center' });
    } else {
      doc.setFillColor(239, 68, 68);
      doc.roundedRect(15, paymentY, 70, 15, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('PENDIENTE DE PAGO', 50, paymentY + 10, { align: 'center' });
    }
    
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);
    
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Gracias por su compra', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Documento generado el ${new Date().toLocaleDateString('es-PE')} a las ${new Date().toLocaleTimeString('es-PE')}`, pageWidth / 2, footerY + 6, { align: 'center' });
    
    // Abrir en nueva ventana
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  }
}
