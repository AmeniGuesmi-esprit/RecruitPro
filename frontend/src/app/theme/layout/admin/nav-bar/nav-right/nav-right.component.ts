import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-nav-right',
  imports: [RouterModule, SharedModule],
  templateUrl: './nav-right.component.html',
  styleUrls: ['./nav-right.component.scss']
})
export class NavRightComponent {
  readonly BASE_URL = 'http://localhost:8222/api/users/files/';

  constructor(private auth: AuthService) {}

  get fullName(): string {
    const user = this.auth.getCurrentUser();
    return user ? `${user.firstName} ${user.lastName}` : '';
  }

  get avatarUrl(): string {
    const user = this.auth.getCurrentUser();
    if (user?.imagePath) {
      const filename = user.imagePath.split(/[\\/]/).pop();
      return `${this.BASE_URL}${filename}`;
    }
    return 'assets/images/user/avatar-2.jpg';
  }
}