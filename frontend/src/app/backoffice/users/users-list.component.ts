import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { User, Role } from '../../core/models/user.model';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss'
})
export class UsersListComponent implements OnInit {
  loading = true;
  error: string | null = null;

  allUsers: User[] = [];
  filteredUsers: User[] = [];

  search = '';
  roleFilter: Role | 'ALL' = 'ALL';

  sortField: 'id' | 'name' | 'email' | 'role' = 'id';
  sortDirection: 'asc' | 'desc' = 'desc';

  currentPage = 1;
  pageSize = 5;

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.error = null;
    this.adminService.getAllUsers().subscribe({
      next: (res) => {
        // Les administrateurs ne sont pas affichés dans cette liste (gestion COMPANY / CANDIDATE uniquement)
        this.allUsers = (res.data ?? []).filter(u => u.role !== 'ADMIN');
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Impossible de charger la liste des utilisateurs.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters(): void {
    const q = this.search.trim().toLowerCase();
    let result = this.allUsers.filter(u => {
      const matchesRole = this.roleFilter === 'ALL' || u.role === this.roleFilter;
      const matchesSearch = !q ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });

    result = this.sortUsers(result);

    this.filteredUsers = result;
    this.currentPage = 1;
  }

  private sortUsers(users: User[]): User[] {
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    return [...users].sort((a, b) => {
      switch (this.sortField) {
        case 'name':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`) * dir;
        case 'email':
          return a.email.localeCompare(b.email) * dir;
        case 'role':
          return a.role.localeCompare(b.role) * dir;
        default:
          return (a.id - b.id) * dir;
      }
    });
  }

  toggleSort(field: 'id' | 'name' | 'email' | 'role'): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.filteredUsers = this.sortUsers(this.filteredUsers);
  }

  get pagedUsers(): User[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredUsers.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onRoleFilterChange(): void {
    this.applyFilters();
  }

  setRoleFilter(role: Role | 'ALL'): void {
    this.roleFilter = role;
    this.applyFilters();
  }

  countByRole(role: Role): number {
    return this.allUsers.filter(u => u.role === role).length;
  }

  getInitials(u: User): string {
    const first = u.firstName?.trim()?.charAt(0) ?? '';
    const last = u.lastName?.trim()?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || '?';
  }
}