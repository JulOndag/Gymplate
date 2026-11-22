import { ChangeDetectorRef, effect, inject, untracked } from '@angular/core';
import { CloudStoreService } from '../../services/cloud-store.service';

/**
 * Re-runs a page's loader every time new data arrives from Firestore,
 * so a new order or a new status shows up without pressing refresh.
 *
 * Use it as a field of the page component:
 *   private live = liveRefresh(() => this.ngOnInit());
 */
export function liveRefresh(refresh: () => void) {
  const cloud = inject(CloudStoreService);
  const cdr = inject(ChangeDetectorRef);   // [LIVE] the app is zoneless: tell Angular to redraw after reloading
  return effect(() => {
    cloud.version();
    untracked(() => {
      refresh();
      cdr.markForCheck();
    });
  });
}
