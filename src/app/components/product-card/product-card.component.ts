import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss']
})

export class ProductCardComponent {
  @Input() profileImageUrl: string = '';
  @Input() categoryName: string = '';
  @Input() name: string = '';
  @Input() description: string = '';
  @Input() price: number = 0;
  @Input() available: boolean = false;
  @Input() productTypeName: string = '';
  @Input() id!: number;
  @Input() onEditCallback?: (id: number) => void;
  constructor(private router: Router) {}

  onEdit() {
    if (this.onEditCallback) {
      this.onEditCallback(this.id);
    } else if (this.id !== undefined && this.id !== null) {
      this.router.navigate(['/home/products/edit-product', this.id]);
    }
  }
}
