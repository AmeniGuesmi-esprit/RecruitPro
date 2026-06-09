export interface NavigationItem {
  id: string; title: string;
  type: 'item' | 'collapse' | 'group';
  translate?: string; icon?: string; hidden?: boolean;
  url?: string; classes?: string; external?: boolean;
  target?: boolean; breadcrumbs?: boolean;
  children?: NavigationItem[];
}

export const NavigationItems: NavigationItem[] = [
  {
    id: 'dashboard', title: 'Dashboard', type: 'group', icon: 'icon-navigation',
    children: [
      { id: 'admin-dashboard', title: 'Tableau de bord', type: 'item',
        classes: 'nav-item', url: '/backoffice/dashboard', icon: 'ti ti-dashboard', breadcrumbs: false }
    ]
  },
  {
    id: 'users', title: 'Gestion', type: 'group', icon: 'icon-navigation',
    children: [
      { id: 'users-list', title: 'Utilisateurs', type: 'item',
        classes: 'nav-item', url: '/backoffice/users', icon: 'ti ti-users' },
      { id: 'companies', title: 'Sociétés', type: 'item',
        classes: 'nav-item', url: '/backoffice/companies', icon: 'ti ti-building' },
      { id: 'jobs', title: 'Offres d\'emploi', type: 'item',
        classes: 'nav-item', url: '/backoffice/jobs', icon: 'ti ti-briefcase' }
    ]
  }
];
