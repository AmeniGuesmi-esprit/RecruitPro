import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminComponent } from './theme/layout/admin/admin.component';
import { GuestComponent } from './theme/layout/guest/guest.component';
import { authGuard, adminGuard, guestGuard } from './core/guards/auth.guard';
import { FrontofficeLayoutComponent } from './frontoffice/layout/frontoffice-layout.component';

const routes: Routes = [

  // LANDING PAGE
  {
    path: '',
    loadComponent: () =>
      import('./landing/landing.component').then(c => c.LandingComponent),
    pathMatch: 'full'
  },

  // VERIFY EMAIL
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./verify-email/verify-email.component').then(c => c.VerifyEmailComponent)
  },

  // ✅ FORGOT PASSWORD
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./forgot-password/forgot-password.component').then(c => c.ForgotPasswordComponent)
  },

  // ✅ RESET PASSWORD (lien reçu par email)
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./reset-password/reset-password.component').then(c => c.ResetPasswordComponent)
  },

  // Auth / Guest
  {
    path: '',
    component: GuestComponent,
    children: [
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./login/login.component').then(c => c.LoginComponent)
      },
      {
        path: 'register',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./register/register.component').then(c => c.RegisterComponent)
      }
    ]
  },

  // Backoffice - Admin
  {
    path: 'backoffice',
    component: AdminComponent,
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./backoffice/dashboard/admin-dashboard.component').then(c => c.AdminDashboardComponent)
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./backoffice/users/users-list.component').then(c => c.UsersListComponent)
      },
      {
        path: 'offers',
        loadComponent: () =>
          import('./backoffice/offers/offers-list.component').then(c => c.OffersListComponent)
      },
      {
        path: 'abonnement',
        loadComponent: () =>
          import('./backoffice/subscription/subscription.component').then(c => c.SubscriptionComponent)
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./backoffice/profile/admin-profile.component').then(c => c.AdminProfileComponent)
      }
    ]
  },

  // Frontoffice - Candidate & Company
  {
    path: 'frontoffice',
    component: FrontofficeLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./frontoffice/dashboard/dashboard.component').then(c => c.FrontofficeDashboardComponent)
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./frontoffice/profile/profile.component').then(c => c.ProfileComponent)
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./frontoffice/projects/projects.component').then(c => c.ProjectsComponent)
      },
      {
        path: 'recommendations',
        loadComponent: () =>
          import('./frontoffice/recommendations/recommendations.component').then(c => c.RecommendationsComponent)
      },
      {
        path: 'applications',
        loadComponent: () =>
          import('./frontoffice/applications/applications.component').then(c => c.ApplicationsComponent)
      },
      {
        path: 'post',
        loadComponent: () =>
          import('./frontoffice/post/post.component').then(c => c.PostComponent)
      },
      {
         path: 'jobs',
         loadComponent: () => 
          import('./frontoffice/jobs/jobs.component').then(c => c.JobsComponent) 
      },
      {
        // ── ABONNEMENT : accessible aux CANDIDATE et COMPANY (voir nav-bar) ──
        path: 'abonnement',
        loadComponent: () =>
          import('./frontoffice/abonnement/abonnement.component').then(c => c.AbonnementComponent)
      },
      {
        // ── HISTORIQUE DE PAIEMENT : accessible depuis le dropdown avatar ──
        path: 'historique-paiement',
        loadComponent: () =>
          import('./frontoffice/payment-history/payment-history.component').then(c => c.PaymentHistoryComponent)
      }
    ]
  },

  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}