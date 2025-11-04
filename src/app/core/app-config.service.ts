import { Injectable, Injector } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { firstValueFrom } from 'rxjs';

export interface AppConfig {
  oidc: {
    authority: string;
    clientId: string;
    redirectUrl: string;
    postLogoutRedirectUri?: string;
    scope?: string;
    responseType?: string;
    secureRoutes?: string[];
    audience?: string;
  };
  resourceServer: { baseUrl: string };
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private config!: AppConfig;

  constructor(private injector: Injector) {}

  get value(): AppConfig {
    return this.config;
  }

  async load(): Promise<void> {
    const res = await fetch('assets/app-config.json', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to load app-config.json: ${res.status} ${res.statusText}`);
    }
    this.config = await res.json();
  }

  async initializeAuth(): Promise<void> {
    const oidcSecurityService = this.injector.get(OidcSecurityService);
    console.log('Initializing authentication');

    const { isAuthenticated } = await firstValueFrom(oidcSecurityService.checkAuth());
    console.log('Authentication initialized, authenticated:', isAuthenticated);
  }
}
