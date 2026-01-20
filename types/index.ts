// ARQUIVO: types/index.ts

export type TabType = 'overview' | 'bookings' | 'customers' | 'wallet' | 'settings';

export interface Profile {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'admin' | 'manager' | 'cleaner';
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  created_at: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Booking {
  id: string;
  tenant_id: string;
  customer_id: string;
  property_name: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  price: number;
  created_at: string;
}

export interface WalletLedger {
  id: string;
  tenant_id: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  created_at: string;
}
