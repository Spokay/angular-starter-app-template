import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrls: ['./header.css'],
  imports: [CommonModule],
})
export class Header {
  private readonly oidcSecurityService = inject(OidcSecurityService);

  isAuthenticated$ = this.oidcSecurityService.isAuthenticated$.pipe(
    map(({ isAuthenticated }) => isAuthenticated),
  );
  userData$ = this.oidcSecurityService.userData$;

  login(): void {
    this.oidcSecurityService.authorize();
  }

  logout(): void {
    this.oidcSecurityService.logoff().subscribe();
  }
}
