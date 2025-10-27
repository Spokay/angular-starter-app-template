import { AppConfigService } from '@core/app-config.service';
import {
  PassedInitialConfig,
  StsConfigLoader,
  StsConfigStaticLoader,
} from 'angular-auth-oidc-client';

// Build the auth configuration from runtime values using the library's loader mechanism
export const authConfig: PassedInitialConfig = {
  loader: {
    provide: StsConfigLoader,
    useFactory: (appConfig: AppConfigService) => {
      const cfg = {
        authority: appConfig.value.oidc.authority,
        redirectUrl: appConfig.value.oidc.redirectUrl ?? window.location.origin,
        postLogoutRedirectUri: appConfig.value.oidc.postLogoutRedirectUri ?? window.location.origin,
        clientId: appConfig.value.oidc.clientId,
        scope: appConfig.value.oidc.scope ?? 'openid profile email',
        responseType: (appConfig.value.oidc.responseType as string) ?? 'code',
        silentRenew: true,
        useRefreshToken: true,
        renewTimeBeforeTokenExpiresInSeconds: 30,
        secureRoutes: appConfig.value.oidc.secureRoutes?.length
          ? appConfig.value.oidc.secureRoutes
          : appConfig.value.resourceServer?.baseUrl
            ? [appConfig.value.resourceServer.baseUrl]
            : [],
        ...(appConfig.value.oidc.audience && { audience: appConfig.value.oidc.audience }),
      } as const;

      return new StsConfigStaticLoader(cfg);
    },
    deps: [AppConfigService],
  },
};
