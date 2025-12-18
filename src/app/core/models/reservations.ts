export interface GetReservations {
  id: number;
  customerId: number;

  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;

  specialistId: number;
  specialistName?: string;
  
  requiresPersonalAdvice: boolean;
  hourAt: string;
  reservedAt: Date;
  statusId: number;
  createdAt: Date;
  service: Service;
}

export interface Service {
  id: number;
  name: null;
  description: null;
  price: number;
}
