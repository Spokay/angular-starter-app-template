import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';

import { Footer } from './layout/footer/footer';
import { Header } from './layout/header/header';

@Component({
  selector: 'app-root',
  templateUrl: 'app.html',
  imports: [RouterOutlet, Header, Footer],
})
export class App implements OnInit {
  private readonly oidcSecurityService = inject(OidcSecurityService);

  ngOnInit(): void {
    this.oidcSecurityService.checkAuth().subscribe(({ isAuthenticated, accessToken }) => {
      console.log('app authenticated', isAuthenticated);
      console.log(`Current access token is '${accessToken}'`);
    });
  }
}
