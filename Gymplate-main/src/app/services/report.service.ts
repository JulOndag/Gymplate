import { Injectable } from '@angular/core';
import { Report, ReportStatus, ReportReason } from '../models';
import { MockDataService } from './mock-data.service';
import { AuthService } from './auth.service';
import { CloudStoreService } from './cloud-store.service';

@Injectable({ providedIn: 'root' })
export class ReportService {
  constructor(
    private mockData: MockDataService,
    private authService: AuthService,
    private cloud: CloudStoreService // [REPORTS-FS #2]
  ) {}

  getAllReports(): Report[] {
    return this.mockData.getReports();
  }

  getCustomerReports(customerId: string): Report[] {
    return this.mockData.getReportsByCustomerId(customerId);
  }

  getSellerReports(sellerId: string): Report[] {
    return this.mockData.getReportsBySellerId(sellerId);
  }

  getOrderReports(orderId: string): Report[] {
    return this.mockData.getReportsByOrderId(orderId);
  }

  getReportById(id: string): Report | undefined {
    return this.mockData.getReportById(id);
  }

  async submitReport(params: {
    orderId: string;
    orderNumber: string;
    sellerId: string;
    businessName: string;
    productId: string;
    productName: string;
    productImageUrl?: string;
    reason: ReportReason;
    description: string;
    evidenceImages: string[];
  }): Promise<{ success: boolean; message: string; report?: Report }> {
    const user = this.authService.user();
    if (!user) {
      return { success: false, message: 'You must be logged in to submit a report.' };
    }

    if (!params.description || params.description.trim().length < 10) {
      return { success: false, message: 'Please provide a detailed description (at least 10 characters).' };
    }

    const refNum = `REP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReport: Report = {
      id: 'rep-' + Date.now(),
      referenceNumber: refNum,
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      customerId: user.id,
      customerName: `${user.firstName} ${user.lastName}`,
      customerEmail: user.email,
      customerPhone: user.phone,
      sellerId: params.sellerId,
      businessName: params.businessName,
      productId: params.productId,
      productName: params.productName,
      productImageUrl: params.productImageUrl,
      reason: params.reason,
      description: params.description.trim(),
      evidenceImages: params.evidenceImages || [],
      status: 'submitted',
      history: [
        {
          timestamp: new Date(),
          updatedBy: `Customer: ${user.firstName} ${user.lastName}`,
          note: `Report filed for ${params.productName} (${params.reason})`
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // [REPORTS-FS #2] Save in Firestore first. Only if it is accepted do we tell the person it was recorded.
    const saved = await this.cloud.saveReport(newReport);
    if (!saved) {
      return {
        success: false,
        message: 'Your report could not be saved. Check your connection and try again (photos may be too large).'
      };
    }
    this.mockData.addReport(newReport);
    return {
      success: true,
      message: `Report ${refNum} has been officially recorded and dispatched to GymPlate Moderation and Kitchen Management.`,
      report: newReport
    };
  }

  async respondAsSeller(reportId: string, responseText: string, sellerName: string): Promise<boolean> {
    if (!responseText || !responseText.trim()) return false;
    // [REPORTS-FS #3] build it, save it in Firestore, and only then update the screen and notify
    const change = this.mockData.buildSellerResponse(reportId, responseText.trim(), sellerName);
    if (!change) return false;
    if (!(await this.cloud.saveReport(change.report))) return false;
    this.mockData.commitReport(change);
    return true;
  }

  async resolveAsAdmin(
    reportId: string,
    status: ReportStatus,
    remarks: string,
    actionTaken: string,
    adminName: string
  ): Promise<boolean> {
    const change = this.mockData.buildResolution(reportId, status, remarks, actionTaken, adminName);
    if (!change) return false;
    if (!(await this.cloud.saveReport(change.report))) return false;
    this.mockData.commitReport(change);
    return true;
  }
}
