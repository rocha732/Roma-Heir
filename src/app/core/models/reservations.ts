export interface GetReservations {
    id:                     number;
    customerId:             number;
    specialistId:           number;
    requiresPersonalAdvice: boolean;
    hourAt:                 string;
    reservedAt:             Date;
    statusId:               number;
    createdAt:              Date;
    service:                Service;
}

export interface Service {
    id:          number;
    name:        null;
    description: null;
    price:       number;
}
