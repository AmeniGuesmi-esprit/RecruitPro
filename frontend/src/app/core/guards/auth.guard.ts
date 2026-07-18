import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Page d'accueil du frontoffice selon le rôle : Offres d'emploi pour les
 *  candidats, Publier une offre pour les recruteurs (la page dashboard a été supprimée). */
export function frontofficeHomeRoute(role: string | null): string {
  return role === 'COMPANY' ? '/frontoffice/post' : '/frontoffice/jobs';
}

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService); const router = inject(Router);
  if (!auth.isLoggedIn()) { router.navigate(['/login']); return false; }
  return true;
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService); const router = inject(Router);
  if (auth.getRole() !== 'ADMIN') { router.navigate([frontofficeHomeRoute(auth.getRole())]); return false; }
  return true;
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService); const router = inject(Router);
  if (auth.isLoggedIn()) {
    const role = auth.getRole();
    router.navigate([role === 'ADMIN' ? '/backoffice/dashboard' : frontofficeHomeRoute(role)]);
    return false;
  }
  return true;
};

/** Redirige '/frontoffice' vers la bonne page selon le rôle (remplace l'ancienne page dashboard). */
export const frontofficeHomeGuard: CanActivateFn = () => {
  const auth = inject(AuthService); const router = inject(Router);
  router.navigate([frontofficeHomeRoute(auth.getRole())]);
  return false;
};