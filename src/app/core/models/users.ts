export interface RequestUsers {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string; // Opcional si no siempre se requiere
  countryId?: number;
  roleId?: number;
  picture?: File | string; // Puede ser un File (para subir) o string (URL)
}

export interface ResponseUsers {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: Country;
  role: Role;
  profileImageUrl: null;
}

export interface Country {
  id: number;
  name: string;
  code: string;
}

export interface Role {
  id: number;
  name: string;
}

export interface RequestAccount {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryId: number;
}

export interface RequestVerifyAccount {
  code: string;
  email: string;
}
