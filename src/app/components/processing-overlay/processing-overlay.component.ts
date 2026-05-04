import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ProcessingOverlayService,
  ProcessingOverlayState,
} from 'src/app/core/services/processing-overlay.service';

@Component({
  selector: 'app-processing-overlay',
  templateUrl: './processing-overlay.component.html',
  styleUrls: ['./processing-overlay.component.scss'],
})
export class ProcessingOverlayComponent {
  state$: Observable<ProcessingOverlayState>;

  constructor(private overlay: ProcessingOverlayService) {
    this.state$ = this.overlay.state$;
  }
}

