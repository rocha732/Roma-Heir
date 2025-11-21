import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-card-citas',
  templateUrl: './card-citas.component.html',
  styleUrls: ['./card-citas.component.scss']
})
export class CardCitasComponent {
  @Input() title = '';
  @Input() value: number | string = 0;

  /** Tipos permitidos: 'total' | 'hoy' | 'pendientes' */
  @Input() type: 'total' | 'hoy' | 'pendientes' = 'total';
}
