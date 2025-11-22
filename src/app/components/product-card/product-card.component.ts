import { Component, Input } from '@angular/core';

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
}
