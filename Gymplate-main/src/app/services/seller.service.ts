import { Injectable } from '@angular/core';
import { SellerApplication, Business, SellerStatus } from '../models';
import { MockDataService } from './mock-data.service';
import { CloudStoreService } from './cloud-store.service';

@Injectable({ providedIn: 'root' })
export class SellerService {
  constructor(private mockData: MockDataService, private cloud: CloudStoreService) {}

  getApplication(userId: string): SellerApplication | undefined {
    return this.mockData.getSellerApplicationByUserId(userId);
  }

  /** Saves the application to Firestore. Returns true only if Firestore accepted it. */
  async submitApplication(application: SellerApplication): Promise<boolean> {
    const ok = await this.cloud.saveApplication(application);
    if (ok) this.mockData.updateSellerApplication(application);
    return ok;
  }

  async updateApplication(application: SellerApplication): Promise<boolean> {
    const ok = await this.cloud.saveApplication(application);
    if (ok) this.mockData.updateSellerApplication(application);
    return ok;
  }

  getBusiness(sellerId: string): Business | undefined {
    return this.mockData.getBusinessBySellerId(sellerId);
  }

  /** [PROFILE-PHOTO] The kitchen name: from the business once approved, otherwise from the application. */
  getKitchenName(sellerId: string): string {
    return (
      this.getBusiness(sellerId)?.businessName ||
      this.getApplication(sellerId)?.businessInfo.businessName ||
      ''
    );
  }

  /** The kitchen logo (from the business, or from the application before approval). Ignores demo entries. */
  getKitchenLogo(sellerId: string): string {
    const url = this.getBusiness(sellerId)?.logoUrl || this.getApplication(sellerId)?.documents.logo?.url || '';
    return url.startsWith('data:') || url.startsWith('http') ? url : '';
  }

  async updateBusiness(business: Business): Promise<boolean> {
    const ok = await this.cloud.saveBusiness(business);
    if (ok) this.mockData.upsertBusiness(business);
    return ok;
  }

  isApproved(userId: string): boolean {
    const app = this.getApplication(userId);
    return app?.status === 'approved';
  }

  getSellerStatus(userId: string): SellerStatus | null {
    const app = this.getApplication(userId);
    return app?.status || null;
  }

  getAllApplications(): SellerApplication[] {
    return this.mockData.getSellerApplications();
  }

  getAllBusinesses(): Business[] {
    return this.mockData.getBusinesses();
  }

  /** Admin action. Returns true only if Firestore accepted it (rules allow admins only). */
  async approveApplication(applicationId: string, adminId: string): Promise<boolean> {
    const app = this.mockData.getSellerApplication(applicationId);
    if (!app) return false;

    const updated: SellerApplication = {
      ...app,
      status: 'approved',
      reviewedBy: adminId,
      reviewedAt: new Date(),
      updatedAt: new Date()
    };

    // The storefront (business) is created together with the approval.
    const business: Business = {
      id: 'biz-' + Date.now(),
      sellerId: app.userId,
      businessName: app.businessInfo.businessName,
      businessType: app.businessInfo.businessType,
      description: app.businessInfo.businessDescription,
      address: app.businessInfo.businessAddress,
      city: app.businessInfo.businessCity,
      state: app.businessInfo.businessState,
      zipCode: app.businessInfo.businessZipCode,
      phone: app.businessInfo.businessPhone,
      email: app.businessInfo.businessEmail,
      operatingHours: app.businessInfo.operatingHours,
      logoUrl: app.documents.logo?.url, // [APP-DOCS] the logo the seller uploaded
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const ok = await this.cloud.approveApplication(updated, business);
    if (ok) {
      this.mockData.updateSellerApplication(updated);
      this.mockData.upsertBusiness(business);
    }
    return ok;
  }

  async rejectApplication(applicationId: string, adminId: string, reason: string): Promise<boolean> {
    const app = this.mockData.getSellerApplication(applicationId);
    if (!app) return false;

    const updated: SellerApplication = {
      ...app,
      status: 'rejected',
      rejectionReason: reason,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      updatedAt: new Date()
    };
    return this.updateApplication(updated);
  }

  async requestMoreInfo(applicationId: string, adminId: string, reason: string): Promise<boolean> {
    const app = this.mockData.getSellerApplication(applicationId);
    if (!app) return false;

    const updated: SellerApplication = {
      ...app,
      status: 'info_required',
      infoRequestReason: reason,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      updatedAt: new Date()
    };
    return this.updateApplication(updated);
  }
}
