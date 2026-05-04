import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ProcessingOverlayState {
  visible: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProcessingOverlayService {
  private readonly stateSubject = new BehaviorSubject<ProcessingOverlayState>({
    visible: false,
    message: '',
  });

  readonly state$ = this.stateSubject.asObservable();

  show(message: string) {
    this.stateSubject.next({ visible: true, message });
  }

  hide() {
    this.stateSubject.next({ visible: false, message: '' });
  }
}

