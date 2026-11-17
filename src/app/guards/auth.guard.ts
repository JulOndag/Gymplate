import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models';

// Every guard first waits for Firebase to finish checking the saved login.

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  await authService.ready;

  if (!authService.isLoggedIn()) {
    router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
  return true;
};

export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => {
  return async (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    await authService.ready;

    if (!authService.isLoggedIn()) {
      router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    const role = authService.userRole();
    if (!role || !allowedRoles.includes(role)) {
      router.navigate(['/']);
      return false;
    }
    return true;
  };
};

export const customerGuard: CanActivateFn = roleGuard(['customer']);
export const sellerGuard: CanActivateFn = roleGuard(['seller']);
export const adminGuard: CanActivateFn = roleGuard(['admin']);

export const guestGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  await authService.ready;

  if (authService.isLoggedIn()) {
    switch (authService.userRole()) {
      case 'customer': router.navigate(['/customer']); break;
      case 'seller': router.navigate(['/seller']); break;
      case 'admin': router.navigate(['/admin']); break;
      default: router.navigate(['/']);
    }
    return false;
  }
  return true;
};
