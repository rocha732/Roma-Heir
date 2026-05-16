import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditReserveComponent } from './edit-reserve.component';

describe('EditReserveComponent', () => {
  let component: EditReserveComponent;
  let fixture: ComponentFixture<EditReserveComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EditReserveComponent]
    });
    fixture = TestBed.createComponent(EditReserveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
