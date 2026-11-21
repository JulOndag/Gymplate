import { ChangeDetectorRef, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { squareAvatarDataUrl } from '../utils/image.util';

/**
 * [PROFILE-PHOTO] Lets the logged-in person add, change or remove their own profile picture.
 * The picture is cropped to a square and shrunk, then saved on their profile in Firestore.
 * If they have no picture, `fallbackUrl` is shown instead (a seller's kitchen logo).
 */
@Component({
  selector: 'app-profile-photo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pp-wrap">
      <div class="pp-avatar">
        <img *ngIf="shownUrl()" [src]="shownUrl()" alt="Profile photo" />
        <span *ngIf="!shownUrl()">{{ initials() }}</span>
      </div>
      <div class="pp-actions">
        <input #fileInput type="file" accept="image/*" hidden (change)="onFile($event)" />
        <div class="pp-buttons">
          <button type="button" class="btn btn-outline btn-sm" [disabled]="busy" (click)="fileInput.click()">
            {{ busy ? 'Saving...' : own() ? 'Change photo' : 'Upload photo' }}
          </button>
          <button type="button" class="btn btn-ghost btn-sm text-danger" *ngIf="own()" [disabled]="busy" (click)="remove()">
            Remove
          </button>
        </div>
        <small class="pp-hint" *ngIf="hint && !own()">{{ hint }}</small>
        <small class="pp-error" *ngIf="error">{{ error }}</small>
      </div>
    </div>
  `,
  styles: [
    `
      .pp-wrap {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
      }
      .pp-avatar {
        width: 84px;
        height: 84px;
        border-radius: 50%;
        overflow: hidden;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-primary);
        color: #fff;
        font-size: 28px;
        font-weight: 700;
        border: 3px solid var(--color-surface);
        box-shadow: 0 0 0 1px var(--color-border);
      }
      .pp-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .pp-actions {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .pp-buttons {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .pp-hint {
        color: var(--color-text-secondary);
        font-size: 11px;
        max-width: 280px;
      }
      .pp-error {
        color: var(--color-danger);
        font-size: 11px;
      }
    `,
  ],
})
export class ProfilePhotoComponent {
  /** Shown when the person has not uploaded their own picture (for example the kitchen logo). */
  @Input() fallbackUrl = '';
  @Input() hint = '';

  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  busy = false;
  error = '';

  own(): string {
    return this.auth.user()?.avatarUrl || '';
  }

  shownUrl(): string {
    return this.own() || this.fallbackUrl;
  }

  initials(): string {
    const u = this.auth.user();
    if (!u) return '?';
    return `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase();
  }

  async onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.error = '';
    if (!file.type.startsWith('image/')) {
      this.error = 'Please choose a picture (JPG, PNG or WEBP).';
      return;
    }
    this.busy = true;
    try {
      const url = await squareAvatarDataUrl(file);
      const ok = await this.auth.setAvatar(url);
      if (!ok) this.error = 'Could not save your photo. Publish the latest firestore.rules and try again.';
    } catch {
      this.error = 'Could not read that picture. Try another one.';
    }
    this.busy = false;
    this.cdr.detectChanges();
  }

  async remove() {
    this.busy = true;
    this.error = '';
    const ok = await this.auth.setAvatar('');
    if (!ok) this.error = 'Could not remove your photo. Try again.';
    this.busy = false;
    this.cdr.detectChanges();
  }
}
