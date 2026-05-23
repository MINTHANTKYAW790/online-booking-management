export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number;
  maxParallel: number;
  requiredSkill: string;
  color: string;
  isActive: boolean;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  skills: string[]; // service IDs
  schedule: {
    [day: string]: { // e.g., 'monday'
      start: string; // 'HH:mm'
      end: string;   // 'HH:mm'
      isWorking: boolean;
    };
  };
  isActive: boolean;
  role: 'admin' | 'staff';
}

export type BookingStatus = 'pending' | 'confirmed' | 'arrived' | 'in_service' | 'completed' | 'cancelled' | 'no_show';

export interface Booking {
  id: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  serviceId: string;
  staffId: string | null;
  startTime: any; // Firestore Timestamp
  endTime: any;   // Firestore Timestamp
  status: BookingStatus;
  createdAt: any;
  updatedAt: any;
}

export interface StoreConfig {
  storeName: string;
  tagline: string;
  logoUrl?: string;
  address: string;
  phoneNumber: string;
  email: string;
  website: string;
  socialMediaLinks: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
  };
  openTime: string;
  closeTime: string;
  lastBookingTime: string;
  bufferTime: number;
  bookingInterval: number;
  themePrimaryColor: string;
  closedDay: number; // 0-6 (Sun-Sat), or -1 for none
}
