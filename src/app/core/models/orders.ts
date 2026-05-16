export interface Orders {
    id:             number;
    totalAmount:    number;
    totalItems:     number;
    deliveryMethod: string;
    orderStatus:    string;
    paid:           boolean;
    paidAt:         Date;
    createdAt:      Date;
    updatedAt:      Date;
    customer?:      Customer;
    items:          Item[];
    showDetails?:   boolean; // UI state for toggling order details
}

export interface Customer {
    customerId: number;
    fullName:   string;
    email:      string;
    phone:      string;
}

export interface Item {
    productId: number;
    price:     number;
    quantity:  number;
    subtotal:  number;
}

// Interfaces para crear orden
export interface CreateOrderRequest {
    customerId: number;
    deliveryMethodId: number;
    items: CreateOrderItem[];
}

export interface CreateOrderItem {
    productId: number;
    quantity: number;
}