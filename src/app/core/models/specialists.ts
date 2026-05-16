export interface SpecialistService {
  id: number;
  name: string;
}
export interface GetSpecialists {
    id:              number;
    firstName:       string;
    lastName:        string;
    email:           string;
    phone:           string;
    countryId?:      string;
    profileImageUrl: null | string;
    services?: SpecialistService[];
    country?: {
        id: number;
        name: string;
        code: string;
    };
    role?: {
        id: number;
        name: string;
    };
}
