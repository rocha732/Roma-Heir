import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarReservationsComponent } from './calendar-reservations.component';

describe('CalendarReservationsComponent', () => {
  let component: CalendarReservationsComponent;
  let fixture: ComponentFixture<CalendarReservationsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CalendarReservationsComponent]
    });
    fixture = TestBed.createComponent(CalendarReservationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
