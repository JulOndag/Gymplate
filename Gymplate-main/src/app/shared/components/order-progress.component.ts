import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';

/**
 * Shows where an order is in its life: placed -> preparing -> ready -> (on the way) -> done.
 * Display only. Pickup orders skip the delivery steps.
 */
@Component({
  selector: 'app-order-progress',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="cancelled" *ngIf="status === 'cancelled'">
      <app-icon name="x-circle" [size]="18" color="var(--color-danger)"></app-icon>
      This order was cancelled.
    </div>

    <ol class="track" *ngIf="status !== 'cancelled'" aria-label="Order progress">
      <li
        *ngFor="let s of steps; let i = index"
        [class.done]="i < current"
        [class.now]="i === current"
        [attr.aria-current]="i === current ? 'step' : null"
      >
        <span class="dot">
          <app-icon *ngIf="i < current || (i === current && last)" name="check" [size]="12" color="#fff"></app-icon>
        </span>
        <span class="lbl">{{ s.label }}</span>
      </li>
    </ol>
  `,
  styles: [
    `
      :host { display: block; }
      .track {
        list-style: none;
        display: flex;
        margin: 0;
        padding: 0;
      }
      .track li {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        position: relative;
        text-align: center;
        font-size: 12px;
        color: var(--color-text-tertiary);
      }
      .track li:not(:first-child)::before {
        content: '';
        position: absolute;
        top: 11px;
        right: 50%;
        width: 100%;
        height: 2px;
        background: var(--color-border);
      }
      .track li.done::before,
      .track li.now::before { background: var(--color-accent); }
      .dot {
        position: relative;
        z-index: 1;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--color-surface);
        border: 2px solid var(--color-border);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .done .dot { background: var(--color-accent); border-color: var(--color-accent); }
      .now .dot {
        border-color: var(--color-accent);
        box-shadow: 0 0 0 4px var(--color-primary-light);
      }
      .now .dot::after {
        content: '';
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--color-accent);
      }
      .now .dot:has(app-icon) { background: var(--color-accent); }
      .now .dot:has(app-icon)::after { display: none; }
      .done, .now { color: var(--color-text); }
      .now .lbl { font-weight: 700; color: var(--color-primary); }
      .cancelled {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        border-radius: var(--radius-md);
        background: var(--color-danger-bg);
        color: #991b1b;
        font-size: var(--font-size-sm);
        font-weight: 500;
      }
      @media (max-width: 520px) {
        .track li { font-size: 10px; }
      }
    `,
  ],
})
export class OrderProgressComponent {
  @Input() status = 'pending';
  @Input() fulfillmentType: 'pickup' | 'delivery' | string = 'pickup';

  get steps(): { key: string; label: string }[] {
    const base = [
      { key: 'pending', label: 'Placed' },
      { key: 'preparing', label: 'Preparing' },
      { key: 'ready', label: this.fulfillmentType === 'delivery' ? 'Ready' : 'Ready for pickup' },
    ];
    return this.fulfillmentType === 'delivery'
      ? [...base, { key: 'out_for_delivery', label: 'On the way' }, { key: 'delivered', label: 'Delivered' }, { key: 'completed', label: 'Completed' }]
      : [...base, { key: 'completed', label: 'Completed' }];
  }

  get current(): number {
    const key = this.status === 'confirmed' ? 'pending' : this.status;
    const i = this.steps.findIndex((s) => s.key === key);
    return i < 0 ? 0 : i;
  }

  /** The final step is reached, so it also gets a check mark. */
  get last(): boolean {
    return this.current === this.steps.length - 1;
  }
}
