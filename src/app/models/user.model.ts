export type UserRole = 'customer' | 'seller' | 'admin';
export type SellerStatus = 'pending' | 'approved' | 'rejected' | 'info_required' | 'suspended';
export type AccountStatus = 'active' | 'suspended';

export interface User {
  id: string;
  email: string;
  passwordHash?: string; // Only for old demo seed data. Real passwords are handled by Firebase Authentication.
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  avatarUrl?: string;
  accountStatus: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerApplication {
  id: string;
  userId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  businessInfo: {
    businessName: string;
    businessType: string;
    businessAddress: string;
    businessCity: string;
    businessState: string;
    businessZipCode: string;
    businessDescription: string;
    businessPhone: string;
    businessEmail: string;
    operatingHours: string;
  };
  documents: {
    governmentId?: { name: string; url: string; type: string };
    businessPermit?: { name: string; url: string; type: string };
    /** [APP-DOCS] Business logo (picture) and the application form signed by the government office. */
    logo?: { name: string; url: string; type: string };
    signedApplication?: { name: string; url: string; type: string };
    supportingDocs?: { name: string; url: string; type: string }[];
  };
  status: SellerStatus;
  reviewNotes?: string;
  rejectionReason?: string;
  infoRequestReason?: string;
  /** [APPEAL] A rejected seller can fix the documents and resubmit, with a note to the admin. */
  appealNote?: string;
  appealCount?: number;
  resubmittedAt?: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  submittedAt: Date;
  updatedAt: Date;
}

export interface Business {
  id: string;
  sellerId: string;
  businessName: string;
  businessType: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  operatingHours: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
