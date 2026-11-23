import { ChangeDetectorRef, Component, OnInit, effect, inject, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SellerService } from '../../services/seller.service';
import { AuthService } from '../../services/auth.service';
import { SellerApplication } from '../../models';
import { SellerSidebarComponent } from '../../shared/components/seller-sidebar.component';
import { IconComponent } from '../../shared/components/icon.component';
import { compressImageToDataUrl } from '../../shared/utils/image.util';

import { CloudStoreService } from '../../services/cloud-store.service';

@Component({
  selector: 'app-seller-pending',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SellerSidebarComponent, IconComponent],
  template: `
    <div class="seller-layout">
      <app-seller-sidebar></app-seller-sidebar>

      <main class="seller-main-content">
        <div class="seller-container container-narrow" *ngIf="application">
          <div class="page-header mb-6">
            <span class="text-xs font-bold uppercase text-primary">Compliance Verification</span>
            <h1>Seller Application Status</h1>
            <p class="text-xs text-secondary">
              Current administrative verification stage for
              {{ application.businessInfo.businessName }}.
            </p>
          </div>

          <!-- Status Card -->
          <div
            class="card status-display-card mb-6"
            [ngClass]="'status-border-' + application.status"
          >
            <div class="flex items-center gap-4">
              <div class="status-icon-bubble" [ngClass]="'bubble-' + application.status">
                <app-icon [name]="getStatusIcon()" [size]="28"></app-icon>
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <h2>Status: {{ formatStatus(application.status) }}</h2>
                  <span class="badge" [ngClass]="'badge-' + getBadgeClass()">{{
                    application.status
                  }}</span>
                </div>
                <p class="text-xs text-secondary mt-1">
                  Submitted on {{ application.submittedAt | date: 'medium' }}
                </p>
              </div>
            </div>

            <!-- Pending Description -->
            <div class="status-body-content mt-6" *ngIf="application.status === 'pending'">
              <div class="alert alert-info">
                <app-icon name="clock" [size]="18"></app-icon>
                <div>
                  <strong>Queue Position: Pending Document Review</strong>
                  <p class="text-xs mt-1">
                    An Administrator is reviewing your attached government identification and health
                    permits. Product publishing will automatically unlock once approved.
                  </p>
                </div>
              </div>
            </div>

            <!-- Rejected Description & Reason -->
            <div class="status-body-content mt-6" *ngIf="application.status === 'rejected'">
              <div class="alert alert-danger">
                <app-icon name="alert-triangle" [size]="20"></app-icon>
                <div>
                  <strong>Application Rejected by Administrator</strong>
                  <p class="text-xs font-semibold mt-1">Rejection Reason:</p>
                  <p class="text-xs mt-1 reason-text">
                    {{
                      application.rejectionReason ||
                        'Commercial food license requirements were not fulfilled.'
                    }}
                  </p>
                </div>
              </div>
            </div>

            <!-- More Info Required Description & Reason -->
            <div class="status-body-content mt-6" *ngIf="application.status === 'info_required'">
              <div class="alert alert-warning">
                <app-icon name="info" [size]="20"></app-icon>
                <div>
                  <strong>Additional Documentation Requested</strong>
                  <p class="text-xs font-semibold mt-1">Administrator Request:</p>
                  <p class="text-xs mt-1 reason-text">
                    {{
                      application.infoRequestReason ||
                        'Please upload a clearer image of your business permit.'
                    }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Approved Description -->
            <div class="status-body-content mt-6" *ngIf="application.status === 'approved'">
              <div class="alert alert-success">
                <app-icon name="check-circle" [size]="20"></app-icon>
                <div>
                  <strong>Verified Partner Approved</strong>
                  <p class="text-xs mt-1">
                    Your kitchen has passed verification. You can now add dishes to the marketplace.
                  </p>
                </div>
              </div>
              <a routerLink="/seller/products/add" class="btn btn-primary btn-sm mt-3">
                <app-icon name="plus" [size]="14"></app-icon>
                Add First Meal
              </a>
            </div>
          </div>

          <!-- [APPEAL] Fix the documents and resubmit the same application (no new account needed) -->
          <div
            class="card appeal-card mb-6"
            *ngIf="application.status === 'rejected' || application.status === 'info_required'"
          >
            <h3>
              {{
                application.status === 'rejected'
                  ? 'Appeal and resubmit your application'
                  : 'Send the missing documents'
              }}
            </h3>
            <p class="text-xs text-secondary mt-1">
              You do <strong>not</strong> need a new account. Replace the documents the admin asked
              about, explain what you fixed, and send the same application back for review.
            </p>

            <ng-container *ngIf="(application.appealCount || 0) < 3; else appealLimit">
              <div class="appeal-docs mt-4">
                <div class="appeal-doc" *ngFor="let d of docRows">
                  <div class="flex-1">
                    <span class="text-xs font-semibold block">{{ d.label }}</span>
                    <span class="text-xs text-secondary">
                      {{
                        edited[d.key]
                          ? 'New file: ' + edited[d.key]!.name
                          : application.documents[d.key]?.name || 'Not provided'
                      }}
                    </span>
                    <small class="text-xs text-danger block" *ngIf="docErrors[d.key]">{{
                      docErrors[d.key]
                    }}</small>
                  </div>
                  <span class="badge badge-success" *ngIf="edited[d.key]">Replaced</span>
                  <input
                    #f
                    type="file"
                    accept="image/*,application/pdf"
                    style="display:none"
                    (change)="onDoc($event, d.key)"
                  />
                  <button type="button" class="btn btn-outline btn-sm" (click)="f.click()">
                    {{ edited[d.key] ? 'Change file' : 'Replace file' }}
                  </button>
                </div>
              </div>

              <!-- [EXTRA-DOCS] Attach more files the admin asked for (for example another valid ID) -->
              <div class="mt-4">
                <span class="text-xs font-semibold block">Additional documents</span>
                <span class="text-xs text-secondary">
                  Use this if the admin asked for something new, like another valid ID. Up to
                  {{ maxExtra }} files.
                </span>

                <div class="appeal-docs mt-2">
                  <div class="appeal-doc" *ngFor="let x of extraDocs; let i = index">
                    <div class="flex-1">
                      <span class="text-xs font-semibold block">{{ x.name }}</span>
                      <span class="text-xs text-secondary">New file</span>
                    </div>
                    <span class="badge badge-success">Added</span>
                    <button type="button" class="btn btn-outline btn-sm" (click)="removeExtra(i)">
                      Remove
                    </button>
                  </div>
                </div>

                <small class="text-xs text-danger block mt-1" *ngIf="extraError">{{
                  extraError
                }}</small>

                <input
                  #extraInput
                  type="file"
                  accept="image/*,application/pdf"
                  style="display:none"
                  (change)="onExtraDoc($event)"
                />
                <button
                  type="button"
                  class="btn btn-outline btn-sm mt-2"
                  [disabled]="extraDocs.length >= maxExtra"
                  (click)="extraInput.click()"
                >
                  + Add another document
                </button>
              </div>

              <div class="form-group mt-4">
                <label class="form-label" for="appealNote">
                  {{
                    application.status === 'rejected'
                      ? 'Your appeal / what you corrected'
                      : 'Note to the admin'
                  }}
                  <span class="text-danger">*</span>
                </label>
                <textarea
                  id="appealNote"
                  class="form-control"
                  rows="4"
                  maxlength="1000"
                  placeholder="Example: I uploaded a clearer copy of my business permit and the signed application form."
                  [(ngModel)]="appealNote"
                ></textarea>
                <small class="text-xs text-secondary"
                  >At least 10 characters. Appeals left:
                  {{ 3 - (application.appealCount || 0) }}.</small
                >
              </div>

              <div class="alert alert-danger mt-3" *ngIf="appealError">
                <app-icon name="alert-circle" [size]="16"></app-icon>
                <span class="text-xs">{{ appealError }}</span>
              </div>

              <button
                type="button"
                class="btn btn-primary mt-3"
                [disabled]="isSending"
                (click)="submitAppeal()"
              >
                {{ isSending ? 'Sending...' : 'Resubmit for review' }}
              </button>
            </ng-container>
            <ng-template #appealLimit>
              <div class="alert alert-warning mt-3">
                <app-icon name="info" [size]="16"></app-icon>
                <span class="text-xs"
                  >You have used all 3 appeals. Please contact the GymPlate administrator.</span
                >
              </div>
            </ng-template>
          </div>

          <!-- Seller's last appeal, while it is being reviewed -->
          <div
            class="alert alert-info mb-6"
            *ngIf="application.status === 'pending' && application.appealNote"
          >
            <app-icon name="check-circle" [size]="16"></app-icon>
            <div>
              <strong>Resubmitted (appeal {{ application.appealCount || 1 }})</strong>
              <p class="text-xs mt-1 reason-text">{{ application.appealNote }}</p>
            </div>
          </div>

          <!-- Submitted Summary -->
          <div class="card submitted-details-card">
            <h3>Submitted Documentation</h3>
            <div class="doc-list mt-3">
              <div class="doc-item">
                <app-icon name="file-text" [size]="16" color="var(--color-primary)"></app-icon>
                <div class="flex-1">
                  <span class="text-xs font-semibold block">Government Photo Identification</span>
                  <span class="text-xs text-secondary">{{
                    application.documents.governmentId?.name || 'Attached'
                  }}</span>
                </div>
                <span class="badge badge-success">Attached</span>
              </div>

              <div class="doc-item mt-2">
                <app-icon name="file-text" [size]="16" color="var(--color-primary)"></app-icon>
                <div class="flex-1">
                  <span class="text-xs font-semibold block">Commercial Sanitary / Food Permit</span>
                  <span class="text-xs text-secondary">{{
                    application.documents.businessPermit?.name || 'Attached'
                  }}</span>
                </div>
                <span class="badge badge-success">Attached</span>
              </div>

              <div class="doc-item mt-2" *ngIf="application.documents.signedApplication">
                <app-icon name="file-text" [size]="16" color="var(--color-primary)"></app-icon>
                <div class="flex-1">
                  <span class="text-xs font-semibold block"
                    >Business Application Signed by the Government</span
                  >
                  <span class="text-xs text-secondary">{{
                    application.documents.signedApplication.name
                  }}</span>
                </div>
                <span class="badge badge-success">Attached</span>
              </div>

              <div
                class="doc-item mt-2"
                *ngFor="let x of application.documents.supportingDocs || []"
              >
                <app-icon name="file-text" [size]="16" color="var(--color-primary)"></app-icon>
                <div class="flex-1">
                  <span class="text-xs font-semibold block">Additional document</span>
                  <span class="text-xs text-secondary">{{ x.name }}</span>
                </div>
                <span class="badge badge-success">Attached</span>
              </div>

              <div class="doc-item mt-2" *ngIf="application.documents.logo">
                <app-icon name="file-text" [size]="16" color="var(--color-primary)"></app-icon>
                <div class="flex-1">
                  <span class="text-xs font-semibold block">Kitchen Logo</span>
                  <span class="text-xs text-secondary">{{ application.documents.logo.name }}</span>
                </div>
                <span class="badge badge-success">Attached</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      .seller-layout {
        display: flex;
        min-height: 100vh;
        background: var(--color-bg-secondary);
      }
      .seller-main-content {
        flex: 1;
        margin-left: var(--sidebar-width);
        padding: var(--space-8) var(--space-6);
      }
      .seller-container {
        max-width: var(--container-narrow);
        margin: 0 auto;
      }

      .status-display-card {
        padding: var(--space-8);
        border: 1px solid var(--color-border);
        background: white;
        border-radius: var(--radius-lg);
      }
      .status-border-pending {
        border-left: 4px solid var(--color-warning);
      }
      .status-border-approved {
        border-left: 4px solid var(--color-success);
      }
      .status-border-rejected {
        border-left: 4px solid var(--color-danger);
      }
      .status-border-info_required {
        border-left: 4px solid #3b82f6;
      }

      .status-icon-bubble {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .bubble-pending {
        background: var(--color-warning-bg);
        color: #92400e;
      }
      .bubble-approved {
        background: var(--color-success-bg);
        color: #166534;
      }
      .bubble-rejected {
        background: var(--color-danger-bg);
        color: #991b1b;
      }
      .bubble-info_required {
        background: var(--color-info-bg);
        color: #1e40af;
      }

      .reason-text {
        background: rgba(0, 0, 0, 0.04);
        padding: 6px 10px;
        border-radius: var(--radius-sm);
        font-style: italic;
      }

      .appeal-card {
        padding: var(--space-6);
        border: 1px solid var(--color-border);
        background: white;
        border-radius: var(--radius-md);
      }
      .appeal-card h3 {
        font-size: var(--font-size-base);
      }
      .appeal-doc {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: 10px 12px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius);
        margin-bottom: var(--space-2);
      }

      .submitted-details-card {
        padding: var(--space-6);
        border: 1px solid var(--color-border);
        background: white;
        border-radius: var(--radius-md);
      }
      .submitted-details-card h3 {
        font-size: var(--font-size-base);
      }
      .doc-item {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: 10px;
        background: var(--color-bg-secondary);
        border-radius: var(--radius);
        border: 1px solid var(--color-border);
      }

      .alert {
        display: flex;
        gap: var(--space-3);
        padding: var(--space-4);
        border-radius: var(--radius);
      }
      .alert-info {
        background: var(--color-info-bg);
        color: #1e40af;
        border: 1px solid rgba(59, 130, 246, 0.3);
      }
      .alert-danger {
        background: var(--color-danger-bg);
        color: #991b1b;
        border: 1px solid rgba(220, 53, 69, 0.3);
      }
      .alert-warning {
        background: var(--color-warning-bg);
        color: #92400e;
        border: 1px solid rgba(245, 158, 11, 0.3);
      }
      .alert-success {
        background: var(--color-success-bg);
        color: #166534;
        border: 1px solid rgba(40, 167, 69, 0.3);
      }

      @media (max-width: 900px) {
        .seller-main-content {
          margin-left: 0;
          padding: var(--space-4);
        }
      }
    `,
  ],
})
export class SellerPendingComponent implements OnInit {
  private cloud = inject(CloudStoreService);

  // Reload this screen whenever Firestore data changes (new application, approval, etc.).
  private liveRefresh = effect(() => {
    this.cloud.version();
    untracked(() => this.ngOnInit());
  });

  application: SellerApplication | undefined;

  // [APPEAL] state for the "fix and resubmit" form
  private cdr = inject(ChangeDetectorRef);
  docRows: {
    key: 'logo' | 'governmentId' | 'businessPermit' | 'signedApplication';
    label: string;
  }[] = [
    { key: 'logo', label: 'Kitchen Logo (picture)' },
    { key: 'governmentId', label: 'Government Photo Identification' },
    { key: 'businessPermit', label: 'Commercial Sanitary / Food Permit' },
    { key: 'signedApplication', label: 'Business Application Signed by the Government' },
  ];
  edited: Partial<
    Record<
      'logo' | 'governmentId' | 'businessPermit' | 'signedApplication',
      { name: string; url: string; type: string }
    >
  > = {};
  docErrors: Partial<Record<string, string>> = {};
  appealNote = '';
  appealError = '';
  isSending = false;

  // [EXTRA-DOCS] new files added on top of the 4 normal documents
  readonly maxExtra = 3;
  extraDocs: { name: string; url: string; type: string }[] = [];
  extraError = '';

  constructor(
    private authService: AuthService,
    private sellerService: SellerService,
  ) {}

  ngOnInit() {
    const user = this.authService.user();
    if (user) {
      this.application = this.sellerService.getApplication(user.id);
    }
  }

  async onDoc(event: Event, key: 'logo' | 'governmentId' | 'businessPermit' | 'signedApplication') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.docErrors[key] = '';
    try {
      const isPdf = file.type === 'application/pdf';
      if (isPdf && key === 'logo') throw new Error('The logo must be a picture (JPG or PNG).');
      if (!isPdf && !file.type.startsWith('image/'))
        throw new Error('Please upload a JPG, PNG or PDF file.');
      let url: string;
      if (isPdf) {
        url = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = () => reject(new Error('Could not read this file.'));
          r.readAsDataURL(file);
        });
        if (url.length > 230000)
          throw new Error(
            'This PDF is too big (max about 170 KB). Upload a clear photo or scan instead.',
          );
      } else {
        url = await compressImageToDataUrl(file, key === 'logo' ? 120000 : 230000);
      }
      this.edited[key] = { name: file.name, url, type: isPdf ? 'application/pdf' : 'image/jpeg' };
    } catch (e) {
      this.docErrors[key] = e instanceof Error ? e.message : 'Could not read this file.';
    }
    this.cdr.markForCheck();
  }

  async onExtraDoc(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.extraError = '';
    try {
      if (this.extraDocs.length >= this.maxExtra)
        throw new Error(`You can add up to ${this.maxExtra} extra files.`);
      const isPdf = file.type === 'application/pdf';
      if (!isPdf && !file.type.startsWith('image/'))
        throw new Error('Please upload a JPG, PNG or PDF file.');
      let url: string;
      if (isPdf) {
        url = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = () => reject(new Error('Could not read this file.'));
          r.readAsDataURL(file);
        });
        if (url.length > 150000)
          throw new Error(
            'This PDF is too big (max about 110 KB). Upload a clear photo or scan instead.',
          );
      } else {
        url = await compressImageToDataUrl(file, 150000);
      }
      this.extraDocs.push({ name: file.name, url, type: isPdf ? 'application/pdf' : 'image/jpeg' });
    } catch (e) {
      this.extraError = e instanceof Error ? e.message : 'Could not read this file.';
    }
    this.cdr.markForCheck();
  }

  removeExtra(i: number) {
    this.extraDocs.splice(i, 1);
    this.cdr.markForCheck();
  }

  async submitAppeal() {
    if (!this.application) return;
    this.appealError = '';
    if (this.appealNote.trim().length < 10) {
      this.appealError =
        'Please write at least 10 characters to tell the admin what you corrected.';
      return;
    }
    const documents = { ...this.application.documents, ...this.edited };
    if (this.extraDocs.length) {
      documents.supportingDocs = [...(documents.supportingDocs || []), ...this.extraDocs];
    }
    // Firestore allows about 1 MB per document, so stop early with a clear message.
    if (JSON.stringify(documents).length > 950000) {
      this.appealError =
        'The files are too large together. Remove one extra file or use a smaller photo.';
      return;
    }
    this.isSending = true;
    const ok = await this.sellerService.resubmitApplication(
      this.application,
      documents,
      this.appealNote,
    );
    this.isSending = false;
    if (ok) {
      this.edited = {};
      this.extraDocs = [];
      this.appealNote = '';
      this.application = this.sellerService.getApplication(
        this.application.userId || this.application.id,
      );
    } else {
      this.appealError = 'Could not send your application. Check your connection and try again.';
    }
    this.cdr.markForCheck();
  }

  formatStatus(s: string): string {
    const map: Record<string, string> = {
      pending: 'Under Review',
      approved: 'Approved Commercial Seller',
      rejected: 'Application Rejected',
      info_required: 'More Information Required',
    };
    return map[s] || s;
  }

  getBadgeClass(): string {
    switch (this.application?.status) {
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

  getStatusIcon(): string {
    switch (this.application?.status) {
      case 'approved':
        return 'check-circle';
      case 'rejected':
        return 'alert-circle';
      case 'info_required':
        return 'info';
      default:
        return 'clock';
    }
  }
}
