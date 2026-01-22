
export enum TabType {
  OVERVIEW = 'overview',
  BOOKINGS = 'bookings',
  CUSTOMERS = 'customers',
  MAP_VIEW = 'map_view',
  WALLET = 'wallet',
  TELEPHONY = 'telephony',
  RESOURCES = 'resources',
  AI_INSIGHTS = 'ai_insights',
  TEAM = 'team',
  PAYROLL = 'payroll',
  FINANCE = 'finance',
  SUPPORT = 'support',
  SETTINGS = 'settings',
  AIRBNB_CENTER = 'airbnb_center'
}


export type AppRole = 'super_admin' | 'property_owner' | 'staff' | 'guest' | 'cleaner';

export interface UserRoleContext {
  user: any | null;
  name: string | null;
  role: AppRole | null;
  loading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isStaff: boolean;
  isGuest: boolean;
  isCleaner: boolean;
  app_access: 'dashboard' | 'cleaner_app' | null;
  canAccessFinance: boolean;
  canAccessSettings: boolean;
  canViewAllProperties: boolean;
  tenant_id: string | null;
  customRoleName: string | null;
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
  customer_id?: string;
  property_name?: string; // Derived or joined
  summary?: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  price?: number;
  assigned_to?: string;
  customers?: {
    name: string;
    address: string;
    latitude?: number;
    longitude?: number;
    geofence_radius?: number;
  };
}
