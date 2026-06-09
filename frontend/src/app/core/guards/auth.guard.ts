import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService); const router = inject(Router);
  if (!auth.isLoggedIn()) { router.navigate(['/login']); return false; }
  return true;
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService); const router = inject(Router);
  if (auth.getRole() !== 'ADMIN') { router.navigate(['/frontoffice/dashboard']); return false; }
  return true;
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService); const router = inject(Router);
  if (auth.isLoggedIn()) {
    const role = auth.getRole();
    router.navigate([role === 'ADMIN' ? '/backoffice/dashboard' : '/frontoffice/dashboard']);
    return false;
  }
  return true;
};
