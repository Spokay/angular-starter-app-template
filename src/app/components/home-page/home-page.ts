import { Component } from '@angular/core';

import { AuthService } from '../../auth/auth.service';
import { UserContext } from '../../auth/user';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {
  constructor(private readonly authService: AuthService) {}

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  get user(): UserContext | null {
    return this.authService.currentUser();
  }

  protected logout() {
    this.authService.logout();
  }
}
