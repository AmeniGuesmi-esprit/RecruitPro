import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { User, Role } from '../../core/models/user.model';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users-list.component.html'
})
export class UsersListComponent implements OnInit {
  loading = true;
  error: string | null = null;

  allUsers: User[] = [];
  filteredUsers: User[] = [];

  search = '';
  roleFilter: Role | 'ALL' = 'ALL';

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
        this.allUsers = res.data ?? [];
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
    this.filteredUsers = this.allUsers.filter(u => {
      const matchesRole = this.roleFilter === 'ALL' || u.role === this.roleFilter;
      const matchesSearch = !q ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onRoleFilterChange(): void {
    this.applyFilters();
  }

  countByRole(role: Role): number {
    return this.allUsers.filter(u => u.role === role).length;
  }
}