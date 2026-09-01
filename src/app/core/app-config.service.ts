import { Injectable, Injector, inject } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';

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
  resourceServer: {
    /**
     * Where the app calls the API — not the server's origin. `/api` behind the dev proxy,
     * and the server's URL including its context path without it. Services read this; it is
     * also what `secureRoutes` covers, which is how the access token gets attached.
     */
    baseUrl: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private injector = inject(Injector);

  private config!: AppConfig;

  get value(): AppConfig {
    return this.config;
  }

  async load(): Promise<void> {
    const configPath = environment.configPath;
    const res = await fetch(configPath, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to load config from ${configPath}: ${res.status} ${res.statusText}`);
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
