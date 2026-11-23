import { ChangeDetectorRef, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';
import { FormsModule } from '@angular/forms';
import { Product, NUTRITION_SOURCES } from '../../models/product.model';
import { ProofErrors, caloriesFromMacros } from '../utils/nutrition-proof.util';
import { compressImageToDataUrl } from '../utils/image.util';

/**
 * [NUTRITION-PROOF] The "reference" part of the add / edit meal form:
 * source, link, ingredients with weights, photo evidence, calorie check and the confirm box.
 * It edits the product object it is given. The parent validates with validateNutritionProof().
 */
@Component({
  selector: 'app-nutrition-proof-fields',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="proof-box">
      <div class="form-group">
        <label class="form-label">Ingredients and weights <span class="text-danger">*</span></label>
        <textarea
          class="form-control"
          rows="3"
          maxlength="1000"
          placeholder="Example: Grilled chicken breast 150g, brown rice 120g, broccoli 80g, olive oil 5g"
          [(ngModel)]="product.ingredients"
          [ngModelOptions]="{ standalone: true }"
        ></textarea>
        <small class="text-xs text-secondary"
          >Customers and admins use this to check the numbers.</small
        >
        <small class="text-xs text-danger block" *ngIf="errors.ingredients">{{
          errors.ingredients
        }}</small>
      </div>

      <div class="form-group mt-3">
        <label class="form-label"
          >Reference source of the values <span class="text-danger">*</span></label
        >
        <select
          class="form-control"
          [(ngModel)]="product.nutritionSourceType"
          [ngModelOptions]="{ standalone: true }"
        >
          <option [ngValue]="undefined">&mdash; Select source &mdash;</option>
          <option *ngFor="let s of sources" [ngValue]="s.value">{{ s.label }}</option>
        </select>
        <small class="text-xs text-danger block" *ngIf="errors.source">{{ errors.source }}</small>
      </div>

      <div class="form-group mt-3">
        <label class="form-label">
          Reference link
          <span class="text-danger" *ngIf="linkRequired()">*</span>
          <span class="text-secondary text-xs" *ngIf="!linkRequired()"
            >(optional for this source)</span
          >
        </label>
        <input
          type="url"
          class="form-control"
          placeholder="https://... (the exact page where the numbers can be checked)"
          [(ngModel)]="product.nutritionSourceUrl"
          [ngModelOptions]="{ standalone: true }"
        />
        <small class="text-xs text-danger block" *ngIf="errors.link">{{ errors.link }}</small>
      </div>

      <div class="form-group mt-3">
        <label class="form-label">Photo evidence <span class="text-danger">*</span></label>
        <input
          #evFile
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          (change)="onEvidence($event)"
          style="display: none"
        />

        <!-- No photo yet: same drop area as the meal photo -->
        <div
          *ngIf="!product.nutritionEvidenceUrl"
          class="dropzone-box"
          [class.is-dragover]="isDragging"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
          (drop)="onDrop($event)"
          (click)="evFile.click()"
        >
          <div class="dropzone-icon">
            <app-icon name="upload" [size]="28" color="var(--color-primary)"></app-icon>
          </div>
          <div class="dropzone-content">
            <p class="dropzone-title">Click to upload evidence photo</p>
            <p class="dropzone-subtitle">or drag and drop the label / reference screenshot here</p>
            <span class="dropzone-hint">PNG, JPG, or WEBP &bull; Max 5MB</span>
          </div>
        </div>

        <!-- Photo uploaded: preview and actions -->
        <div *ngIf="product.nutritionEvidenceUrl" class="uploaded-image-card">
          <div class="image-preview-frame">
            <img [src]="product.nutritionEvidenceUrl" alt="Evidence preview" />
          </div>
          <div class="uploaded-image-details">
            <div class="image-status-badge">
              <app-icon name="check" [size]="14" color="var(--color-primary)"></app-icon>
              <span>Evidence photo uploaded</span>
            </div>
            <p class="image-filename" *ngIf="fileName">{{ fileName }}</p>
            <p class="text-xs text-secondary mt-1">
              The admin compares this photo with the numbers you entered.
            </p>
            <div class="uploaded-image-actions mt-3">
              <button type="button" class="btn btn-outline btn-sm" (click)="evFile.click()">
                <app-icon name="upload" [size]="14"></app-icon>
                Change Photo
              </button>
              <button
                type="button"
                class="btn btn-ghost btn-sm text-danger"
                (click)="clearEvidence(evFile)"
              >
                <app-icon name="trash" [size]="14"></app-icon>
                Remove Photo
              </button>
            </div>
          </div>
        </div>

        <div *ngIf="uploadError" class="image-error-alert mt-2">
          <app-icon name="alert-circle" [size]="15" color="#dc2626"></app-icon>
          <span>{{ uploadError }}</span>
        </div>
        <small class="text-xs text-danger block" *ngIf="errors.evidence">{{
          errors.evidence
        }}</small>
      </div>

      <div class="calorie-hint" [class.bad]="!!errors.calories">
        Calories from your macros: <strong>about {{ calc() }} kcal</strong> (protein &times; 4 +
        carbs &times; 4 + fat &times; 9). You entered {{ product.nutrition.calories }} kcal.
      </div>
      <div class="proof-error" *ngIf="errors.calories">{{ errors.calories }}</div>
      <div class="proof-error" *ngIf="errors.serving">{{ errors.serving }}</div>
      <div class="proof-error" *ngIf="errors.weight">{{ errors.weight }}</div>
      <div class="proof-error" *ngIf="errors.reference">{{ errors.reference }}</div>

      <label class="confirm-row">
        <input
          type="checkbox"
          [(ngModel)]="state.confirmed"
          [ngModelOptions]="{ standalone: true }"
        />
        <span>I confirm these values are accurate to the best of my knowledge.</span>
      </label>
      <small class="text-xs text-danger block" *ngIf="errors.confirm">{{ errors.confirm }}</small>
    </div>
  `,
  styles: [
    `
      .proof-box {
        margin-top: 16px;
        padding: 16px;
        border: 1px solid var(--color-border);
        border-radius: 12px;
        background: var(--color-bg-secondary);
      }
      .dropzone-box {
        border: 2px dashed var(--color-border);
        border-radius: var(--radius-md);
        padding: var(--space-6) var(--space-4);
        background: #fff;
        text-align: center;
        cursor: pointer;
        transition: all var(--transition-fast);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
      }
      .dropzone-box:hover,
      .dropzone-box.is-dragover {
        border-color: var(--color-primary);
        background: rgba(22, 101, 52, 0.04);
      }
      .dropzone-icon {
        width: 48px;
        height: 48px;
        border-radius: var(--radius-full);
        background: white;
        border: 1px solid var(--color-border);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: var(--space-1);
      }
      .dropzone-title {
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--color-text);
        margin: 0;
      }
      .dropzone-subtitle {
        font-size: var(--text-xs);
        color: var(--color-text-secondary);
        margin: 2px 0 6px 0;
      }
      .dropzone-hint {
        display: inline-block;
        font-size: 11px;
        color: var(--color-text-tertiary);
        background: white;
        padding: 3px 10px;
        border-radius: var(--radius-full);
        border: 1px solid var(--color-border);
      }
      .uploaded-image-card {
        display: flex;
        gap: var(--space-4);
        padding: var(--space-4);
        background: #fff;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        align-items: center;
        flex-wrap: wrap;
      }
      .image-preview-frame {
        width: 140px;
        height: 105px;
        border-radius: var(--radius-sm);
        overflow: hidden;
        flex-shrink: 0;
        border: 1px solid var(--color-border);
        background: white;
      }
      .image-preview-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .uploaded-image-details {
        flex: 1;
        min-width: 180px;
      }
      .image-status-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 11px;
        font-weight: 600;
        color: var(--color-primary);
        background: rgba(22, 101, 52, 0.08);
        padding: 3px 8px;
        border-radius: var(--radius-full);
      }
      .image-filename {
        font-size: var(--text-xs);
        font-weight: 500;
        color: var(--color-text);
        margin: 6px 0 0 0;
        word-break: break-all;
      }
      .uploaded-image-actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }
      .image-error-alert {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: var(--text-xs);
        color: #dc2626;
        background: #fef2f2;
        border: 1px solid #fecaca;
        padding: 6px 12px;
        border-radius: var(--radius-sm);
      }
      .calorie-hint {
        margin-top: 14px;
        font-size: 12.5px;
        padding: 9px 12px;
        border-radius: 9px;
        background: #fff;
        border: 1px solid var(--color-border);
        color: var(--color-text-secondary);
      }
      .calorie-hint.bad {
        border-color: var(--color-danger);
      }
      .proof-error {
        margin-top: 8px;
        padding: 10px 12px;
        border-radius: 9px;
        background: #fdecec;
        color: #a12828;
        font-size: 12.5px;
      }
      .confirm-row {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-top: 14px;
        font-size: 13px;
        cursor: pointer;
      }
      .confirm-row input {
        width: 18px;
        height: 18px;
        accent-color: var(--color-primary);
      }
    `,
  ],
})
export class NutritionProofFieldsComponent {
  private cdr = inject(ChangeDetectorRef);
  @Input({ required: true }) product!: Product;
  @Input() errors: ProofErrors = {};
  /** The parent keeps this object so it can read "confirmed" when saving. */
  @Input() state: { confirmed: boolean } = { confirmed: false };

  sources = NUTRITION_SOURCES;
  uploadError = '';
  isDragging = false;
  fileName = '';

  linkRequired(): boolean {
    return !!this.sources.find((s) => s.value === this.product.nutritionSourceType)?.needsLink;
  }

  calc(): number {
    return caloriesFromMacros(this.product.nutrition);
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) this.useFile(file);
  }

  onEvidence(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.useFile(file);
    input.value = '';
  }

  private async useFile(file: File) {
    this.uploadError = '';
    if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
      this.uploadError = 'Please upload a valid image file (PNG, JPG, or WEBP).';
    } else if (file.size > 5 * 1024 * 1024) {
      this.uploadError = 'Image size must be 5MB or less.';
    } else {
      try {
        // kept small (about 200 KB) so the meal still fits in one Firestore document
        this.product.nutritionEvidenceUrl = await compressImageToDataUrl(file, 200000);
        this.fileName = file.name;
      } catch {
        this.uploadError = 'Could not use that image. Try a smaller or clearer photo.';
      }
    }
    this.cdr.markForCheck();
  }

  clearEvidence(input?: HTMLInputElement) {
    this.product.nutritionEvidenceUrl = '';
    this.fileName = '';
    this.uploadError = '';
    if (input) input.value = '';
  }
}
