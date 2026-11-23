import { Component, OnInit } from '@angular/core';
import { liveRefresh } from '../../shared/utils/live-refresh';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SellerService } from '../../services/seller.service';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { MockDataService } from '../../services/mock-data.service';
import { SellerApplication } from '../../models';
import { AdminSidebarComponent } from '../../shared/components/admin-sidebar.component';
import { IconComponent } from '../../shared/components/icon.component';

@Component({
  selector: 'app-admin-application-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminSidebarComponent, IconComponent],
  template: `
    <div class="admin-layout">
      <app-admin-sidebar></app-admin-sidebar>

      <main class="admin-main-content">
        <div class="admin-container container-narrow" *ngIf="application">
          <!-- Header -->
          <div class="page-header flex justify-between items-center flex-wrap gap-4 mb-6">
            <div>
              <a routerLink="/admin/applications" class="back-btn"><app-icon name="arrow-left" [size]="14"></app-icon> Back to Verification Queue</a>
              <h1>Inspect Application: {{ application.businessInfo.businessName }}</h1>
              <p class="text-xs text-secondary">
                Submitted on {{ application.submittedAt | date: 'medium' }}
              </p>
            </div>
            <div class="flex gap-2">
              <span class="badge" [ngClass]="'badge-' + getBadgeClass(application.status)">
                Status: {{ application.status }}
              </span>
            </div>
          </div>

          <!-- Action Decisions Card -->
          <div class="card action-bar-card mb-6" *ngIf="isDecidable()">
            <div class="flex justify-between items-center flex-wrap gap-4">
              <div>
                <strong class="text-xs uppercase text-warning block"
                  >Compliance Determination</strong
                >
                <span class="text-xs text-secondary"
                  >Select an action to update this seller's verification state.</span
                >
              </div>
              <div class="flex gap-2">
                <button class="btn btn-success btn-sm" (click)="openApproveModal()">
                  <app-icon name="check-circle" [size]="14"></app-icon>
                  Approve Application
                </button>
                <button class="btn btn-secondary btn-sm" (click)="openActionModal('info_required')">
                  <app-icon name="info" [size]="14"></app-icon>
                  Request More Info
                </button>
                <button class="btn btn-danger btn-sm" (click)="openActionModal('rejected')">
                  <app-icon name="x-circle" [size]="14"></app-icon>
                  Reject Application
                </button>
              </div>
            </div>
          </div>

          <!-- Existing Rejection/Notes Banner if any -->
          <div class="alert alert-danger mb-6" *ngIf="application.rejectionReason">
            <app-icon name="alert-circle" [size]="18"></app-icon>
            <div>
              <strong>Application Rejected</strong>
              <p class="text-xs mt-1">Reason: {{ application.rejectionReason }}</p>
            </div>
          </div>

          <div class="alert alert-info mb-6" *ngIf="application.infoRequestReason">
            <app-icon name="info" [size]="18"></app-icon>
            <div>
              <strong>Additional Documentation Requested</strong>
              <p class="text-xs mt-1">Reason: {{ application.infoRequestReason }}</p>
            </div>
          </div>

          <!-- 2 Columns: Applicant Info & Business Info -->
          <div class="review-grid mb-6">
            <!-- Left: Business Info -->
            <div class="card detail-panel">
              <h3>Commercial Kitchen Information</h3>
              <div class="field-line">
                <span class="lbl">Kitchen Name:</span>
                <span class="val font-semibold">{{ application.businessInfo.businessName }}</span>
              </div>
              <div class="field-line">
                <span class="lbl">Classification:</span>
                <span class="val">{{ application.businessInfo.businessType }}</span>
              </div>
              <div class="field-line">
                <span class="lbl">Kitchen Address:</span>
                <span class="val"
                  >{{ application.businessInfo.businessAddress }},
                  {{ application.businessInfo.businessCity }},
                  {{ application.businessInfo.businessState }}</span
                >
              </div>
              <div class="field-line">
                <span class="lbl">Operating Hours:</span>
                <span class="val">{{ application.businessInfo.operatingHours }}</span>
              </div>
              <div class="field-line">
                <span class="lbl">Business Phone:</span>
                <span class="val">{{ application.businessInfo.businessPhone }}</span>
              </div>
              <div class="field-line">
                <span class="lbl">Business Email:</span>
                <span class="val">{{ application.businessInfo.businessEmail }}</span>
              </div>
              <div class="field-line-block mt-3">
                <span class="lbl block font-medium">Concept Description:</span>
                <p class="text-xs text-secondary mt-1">
                  {{ application.businessInfo.businessDescription }}
                </p>
              </div>
            </div>

            <!-- Right: Representative Personal Details -->
            <div class="card detail-panel">
              <h3>Primary Representative</h3>
              <div class="field-line">
                <span class="lbl">Full Name:</span>
                <span class="val font-semibold"
                  >{{ application.personalInfo.firstName }}
                  {{ application.personalInfo.lastName }}</span
                >
              </div>
              <div class="field-line">
                <span class="lbl">Direct Phone:</span>
                <span class="val">{{ application.personalInfo.phone }}</span>
              </div>
              <div class="field-line">
                <span class="lbl">Residential Address:</span>
                <span class="val">{{ application.personalInfo.address }}</span>
              </div>
              <div class="field-line">
                <span class="lbl">Location:</span>
                <span class="val"
                  >{{ application.personalInfo.city }}, {{ application.personalInfo.state }}
                  {{ application.personalInfo.zipCode }}</span
                >
              </div>
            </div>
          </div>

          <!-- Uploaded Documents Inspection Panel -->
          <div class="card docs-inspection-panel mb-6">
            <div class="panel-header mb-4">
              <h3>Attached Compliance Documentation</h3>
              <p class="text-xs text-secondary">
                Secured access: Only logged-in Administrators can inspect private legal files.
              </p>
            </div>

            <!-- [APP-DOCS] The real files the seller uploaded -->
            <div class="grid-2 docs-grid">
              <div class="doc-preview-box card" *ngFor="let row of docRows()">
                <div class="flex items-center gap-2 mb-2">
                  <app-icon name="file-text" [size]="18" color="var(--color-primary)"></app-icon>
                  <strong class="text-xs">{{ row.label }}</strong>
                </div>
                <ng-container *ngIf="row.doc as doc; else missingDoc">
                  <span class="filename text-xs font-mono block">{{ doc.name }}</span>
                  <div class="real-doc-preview" *ngIf="hasFile(doc) && isImg(doc)">
                    <img [src]="doc.url" [alt]="row.label" (click)="openDoc(doc)" />
                  </div>
                  <div class="real-doc-preview pdf" *ngIf="hasFile(doc) && !isImg(doc)">PDF document</div>
                  <div class="real-doc-preview pdf" *ngIf="!hasFile(doc)">Demo entry (no real file was uploaded)</div>
                  <button type="button" class="btn btn-outline btn-sm mt-2" *ngIf="hasFile(doc)" (click)="openDoc(doc)">
                    Open full size &#8599;
                  </button>
                </ng-container>
                <ng-template #missingDoc>
                  <span class="text-xs text-danger">Not provided</span>
                </ng-template>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Modal for Reject or Request Info with Mandatory Reason -->
    <div class="modal-overlay" *ngIf="showActionModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>
            {{
              modalAction === 'rejected'
                ? 'Reject Seller Application'
                : 'Request Additional Information'
            }}
          </h3>
          <button class="modal-close" (click)="showActionModal = false">
            <app-icon name="x" [size]="20"></app-icon>
          </button>
        </div>
        <div class="modal-body">
          <p class="text-xs text-secondary mb-3">
            {{
              modalAction === 'rejected'
                ? 'Please provide a clear justification explaining why this applicant did not meet commercial food safety standards.'
                : 'Specify exactly which permits or identity documents the applicant must re-submit for review.'
            }}
          </p>
          <div class="form-group">
            <label class="form-label" for="actionReason">Mandatory Administrative Reason *</label>
            <textarea
              id="actionReason"
              class="form-control"
              rows="4"
              placeholder="e.g. Health inspection permit expired. Please submit current municipal license..."
              [(ngModel)]="modalReason"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="showActionModal = false">Cancel</button>
          <button
            class="btn"
            [ngClass]="modalAction === 'rejected' ? 'btn-danger' : 'btn-primary'"
            [disabled]="!modalReason.trim()"
            (click)="confirmModalAction()"
          >
            Confirm Decision
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .real-doc-preview {
        margin-top: 8px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        overflow: hidden;
        background: var(--color-bg-secondary);
      }
      .real-doc-preview img {
        display: block;
        width: 100%;
        max-height: 220px;
        object-fit: contain;
        cursor: zoom-in;
      }
      .real-doc-preview.pdf {
        padding: 18px;
        text-align: center;
        font-size: 12px;
        color: var(--color-text-secondary);
      }
      .admin-layout {
        display: flex;
        min-height: 100vh;
        background: var(--color-bg-secondary);
      }
      .admin-main-content {
        flex: 1;
        margin-left: var(--sidebar-width);
        padding: var(--space-8) var(--space-6);
      }
      .admin-container {
        max-width: var(--container-narrow);
        margin: 0 auto;
      }

      .action-bar-card {
        padding: var(--space-4) var(--space-5);
        border: 1px solid var(--color-border);
        background: white;
      }

      .review-grid {
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: var(--space-6);
      }
      .detail-panel {
        padding: var(--space-5);
        border: 1px solid var(--color-border);
        background: white;
      }
      .detail-panel h3 {
        font-size: var(--font-size-base);
        margin-bottom: var(--space-4);
        padding-bottom: var(--space-2);
        border-bottom: 1px solid var(--color-border);
      }

      .field-line {
        display: flex;
        justify-content: space-between;
        font-size: var(--font-size-xs);
        margin-bottom: 6px;
      }
      .field-line .lbl {
        color: var(--color-text-secondary);
      }

      .docs-inspection-panel {
        padding: var(--space-6);
        border: 1px solid var(--color-border);
        background: white;
      }
      .docs-inspection-panel h3 {
        font-size: var(--font-size-base);
      }
      .docs-grid {
        gap: var(--space-4);
      }
      .doc-preview-box {
        padding: var(--space-4);
        border: 1px solid var(--color-border);
        background: var(--color-bg-secondary);
      }
      .doc-mock-preview {
        margin-top: var(--space-3);
        padding: var(--space-4);
        background: white;
        border: 1px dashed var(--color-border);
        border-radius: var(--radius);
      }
      .mock-id-card {
        display: flex;
        align-items: center;
        gap: var(--space-3);
      }
      .mock-id-text {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .id-bar {
        height: 6px;
        background: var(--color-border);
        border-radius: 3px;
      }
      .id-bar.short {
        width: 60%;
      }

      .alert {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: 12px 14px;
        border-radius: var(--radius);
      }
      .alert-danger {
        background: var(--color-danger-bg);
        color: #991b1b;
        border: 1px solid rgba(220, 53, 69, 0.3);
      }
      .alert-info {
        background: var(--color-info-bg);
        color: #1e40af;
        border: 1px solid rgba(59, 130, 246, 0.3);
      }

      @media (max-width: 900px) {
        .admin-main-content {
          margin-left: 0;
          padding: var(--space-4);
        }
        .review-grid,
        .docs-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminApplicationDetailComponent implements OnInit {
  application: SellerApplication | undefined;

  // [APP-DOCS] the files the seller uploaded, for the viewer
  docRows(): { label: string; doc?: { name: string; url: string; type: string } }[] {
    const d = this.application?.documents;
    return [
      { label: 'Kitchen Logo', doc: d?.logo },
      { label: 'Government Photo ID', doc: d?.governmentId },
      { label: 'Commercial Food Permit', doc: d?.businessPermit },
      { label: 'Business Application Signed by the Government', doc: d?.signedApplication },
    ];
  }

  isImg(doc: { type: string }): boolean {
    return doc.type.startsWith('image/');
  }

  /** Older or demo entries have no real file. */
  hasFile(doc: { url: string }): boolean {
    return doc.url.startsWith('data:') || doc.url.startsWith('http');
  }

  /** Browsers block data: links, so the file is turned into a temporary link first. */
  async openDoc(doc: { url: string }) {
    if (!doc.url.startsWith('data:')) {
      window.open(doc.url, '_blank', 'noopener');
      return;
    }
    const blob = await (await fetch(doc.url)).blob();
    window.open(URL.createObjectURL(blob), '_blank', 'noopener');
  }

  showActionModal = false;
  modalAction: 'rejected' | 'info_required' = 'rejected';
  modalReason = '';

  // [LIVE] reload this screen when Firestore sends new data (no page refresh needed)
  private live = liveRefresh(() => this.ngOnInit());

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mockData: MockDataService,
    private sellerService: SellerService,
    private adminService: AdminService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.application = this.mockData.getSellerApplication(id);
    }
  }

  // Hide decision buttons once an application is approved or rejected.
  isDecidable(): boolean {
    return (
      !!this.application &&
      (this.application.status === 'pending' || this.application.status === 'info_required')
    );
  }

  getBadgeClass(status: string): string {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'info_required':
        return 'info';
      default:
        return 'warning';
    }
  }

  async openApproveModal() {
    if (!this.application) return;
    if (
      confirm(
        `Approve "${this.application.businessInfo.businessName}" as a verified commercial seller? A storefront profile will be created automatically.`,
      )
    ) {
      const admin = this.authService.user();
      const adminId = admin?.id || 'admin-1';
      const ok = await this.sellerService.approveApplication(this.application.id, adminId);
      if (!ok) {
        alert(
          'Could not save the approval. Check your connection and that you are logged in as an administrator.',
        );
        return;
      }
      this.adminService.logActivity(
        adminId,
        'Approved Seller Application',
        'application',
        this.application.id,
        `Approved ${this.application.businessInfo.businessName}`,
      );
      this.router.navigate(['/admin/applications']);
    }
  }

  openActionModal(action: 'rejected' | 'info_required') {
    this.modalAction = action;
    this.modalReason = '';
    this.showActionModal = true;
  }

  async confirmModalAction() {
    if (!this.application || !this.modalReason.trim()) return;

    const admin = this.authService.user();
    const adminId = admin?.id || 'admin-1';
    let ok: boolean;

    if (this.modalAction === 'rejected') {
      ok = await this.sellerService.rejectApplication(
        this.application.id,
        adminId,
        this.modalReason,
      );
      if (ok) {
        this.adminService.logActivity(
          adminId,
          'Rejected Seller Application',
          'application',
          this.application.id,
          `Rejected ${this.application.businessInfo.businessName}`,
          this.modalReason,
        );
      }
    } else {
      ok = await this.sellerService.requestMoreInfo(this.application.id, adminId, this.modalReason);
      if (ok) {
        this.adminService.logActivity(
          adminId,
          'Requested Info for Seller',
          'application',
          this.application.id,
          `Requested more info for ${this.application.businessInfo.businessName}`,
          this.modalReason,
        );
      }
    }

    if (!ok) {
      alert(
        'Could not save this action. Check your connection and that you are logged in as an administrator.',
      );
      return;
    }

    this.showActionModal = false;
    this.router.navigate(['/admin/applications']);
  }
}
