import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReservarCitaClienteComponent } from './reservar-cita-cliente.component';

describe('ReservarCitaClienteComponent', () => {
  let component: ReservarCitaClienteComponent;
  let fixture: ComponentFixture<ReservarCitaClienteComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ReservarCitaClienteComponent]
    });
    fixture = TestBed.createComponent(ReservarCitaClienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
