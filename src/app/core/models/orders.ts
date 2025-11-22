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
    customer:       Customer;
    items:          Item[];
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
