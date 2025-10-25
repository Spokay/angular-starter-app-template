import { AuthConfig } from 'angular-oauth2-oidc';

export interface ClientAuthConfig {
  tokenValidationIntervalMs: number;
  enableCrossTabSync: boolean;
  enableDebugLogging: boolean;
  sessionTimeoutMs?: number;
  retryAttempts: number;
  retryDelayMs: number;
}

export const clientAuthConfig: ClientAuthConfig = {
  tokenValidationIntervalMs: 30000,
  enableCrossTabSync: true,
  enableDebugLogging: true,
  sessionTimeoutMs: undefined, // Use OAuth server settings
  retryAttempts: 3,
  retryDelayMs: 1000,
};

export const authCodeFlowConfig: AuthConfig = {
  // Url of the Identity Provider
  issuer: 'http://localhost:8083/api',
  // skipIssuerCheck: true,
  requireHttps: false,
  // URL of the SPA to redirect the user to after login
  redirectUri: window.location.origin,

  // The SPA's id. The SPA is registerd with this id at the auth-server
  // clientId: 'server.code',
  clientId: 'angular-spa-client',

  // Just needed if your auth server demands a secret. In general, this
  // is a sign that the auth server is not configured with SPAs in mind
  // and it might not enforce further best practices vital for security
  // such applications.
  // dummyClientSecret: 'secret',

  responseType: 'code',

  // set the scope for the permissions the client should request
  // The first four are defined by OIDC.
  // Important: Request offline_access to get a refresh token
  // The api scope is a usecase specific one
  scope: 'openid profile email offline_access',

  showDebugInformation: true,
  oidc: true,
  clearHashAfterLogin: true,
};

