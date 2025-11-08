import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';

@Component({
  selector: 'app-login-page',
  imports: [],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
})
export class LoginPage implements OnInit {
  constructor(
    private readonly _oidcSecurityService: OidcSecurityService,
    private readonly _router: Router,
  ) {}

  ngOnInit(): void {
    // If already authenticated, redirect to home
    this._oidcSecurityService.isAuthenticated$.subscribe(({ isAuthenticated }) => {
      if (isAuthenticated) {
        this._router.navigate(['/home']);
      }
    });
  }

  login(): void {
    this._oidcSecurityService.authorize();
  }
}
