import {Injectable, signal, WritableSignal, computed} from '@angular/core';
import {OAuthService, OAuthSuccessEvent} from 'angular-oauth2-oidc';
import {filter, tap} from 'rxjs';
import {UserContext, AuthState} from './user';
import {authCodeFlowConfig, clientAuthConfig} from './auth-config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authState: WritableSignal<AuthState> = signal<AuthState>({
    user: null,
    isLoading: false,
    isInitialized: false,
    error: null
  });

  // Public computed properties
  public currentUser = computed(() => this.authState().user);
  public isLoading = computed(() => this.authState().isLoading);
  public isInitialized = computed(() => this.authState().isInitialized);
  public error = computed(() => this.authState().error);
  public isAuthenticated = computed(() => !!this.authState().user);

  private tokenCheckInterval?: number;
  private readonly crossTabStorageKey = 'oauth_user_context';

  constructor(private readonly oauthService: OAuthService) {
    this.setupOAuth();
    this.setupEventHandlers();
    if (clientAuthConfig.enableCrossTabSync) {
      this.setupCrossTabSync();
    }
  }

  async initAuth(): Promise<void> {
    this.updateAuthState({ isLoading: true, error: null });

    try {
      const isLoggedIn = await this.oauthService.loadDiscoveryDocumentAndTryLogin();
      console.log('Discovery document loaded, user logged in:', isLoggedIn);

      if (isLoggedIn) {
        await this.handleUserLoggedIn();
      } else {
        this.handleUserLoggedOut();
        throw new Error('User not logged in');
      }
    } catch (error) {
      console.error('Error during auth initialization:', error);
      this.updateAuthState({
        isLoading: false,
        isInitialized: true,
        error: (error as Error).message
      });
      throw error;
    } finally {
      this.updateAuthState({ isLoading: false, isInitialized: true });
    }
  }

  logout(): void {
    this.oauthService.logOut();
    this.updateAuthState({ user: null, error: null });
    this.clearCrossTabUserContext();
    this.stopTokenValidation();
  }

  private setupOAuth(): void {
    this.oauthService.configure(authCodeFlowConfig);
    this.oauthService.setStorage(localStorage);
  }

  private setupEventHandlers(): void {
    // Token events
    this.setupTokenEventHandlers();

    // Session events
    this.setupSessionEventHandlers();
  }

  private async handleUserLoggedIn(): Promise<void> {
    console.log('User logged in, setting up silent refresh...');
    this.oauthService.setupAutomaticSilentRefresh();
    await this.loadUserProfile();
  }

  private handleUserLoggedOut(): void {
    console.log('User not logged in, initiating code flow...');
    this.oauthService.initCodeFlow();
  }

  private async loadUserProfile(): Promise<void> {
    try {
      // Ensure we have a valid access token
      if (!this.oauthService.hasValidAccessToken()) {
        console.log('No valid access token, checking for refresh token...');

        // Check if we can refresh the token
        const refreshToken = this.oauthService.getRefreshToken();
        if (!refreshToken) {
          console.warn('No refresh token available, redirecting to login...');
          this.handleUserLoggedOut();
          throw new Error('Session expired - no refresh token available');
        }

        console.log('Refresh token available, attempting refresh...');
        await this.refreshToken();
      }

      console.log('Loading user profile...');
      const userProfile = await this.oauthService.loadUserProfile();

      const userContext = this.buildUserContext(userProfile);
      this.updateAuthState({ user: userContext, error: null });
      this.syncUserContextCrossTabs(userContext);

      console.log('User profile loaded:', userContext);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      this.updateAuthState({ error: (error as Error).message });
      throw error;
    }
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = this.oauthService.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    console.log('Attempting token refresh...');
    await this.oauthService.silentRefresh();

    if (!this.oauthService.hasValidAccessToken()) {
      throw new Error('Token refresh failed - no valid access token after refresh');
    }

    console.log('Token refresh successful');
  }

  private handleOAuthEvent(event: any): void {
    switch (event.type) {
      case 'token_received':
      case 'token_refreshed':
        this.loadUserProfile().catch(error => console.error('Error loading profile after token event:', error));
        break;
      case 'user_profile_loaded':
        if (event.info && Object.keys(event.info).length > 0) {
          const userContext = this.buildUserContext(event.info);
          this.updateAuthState({ user: userContext, error: null });
          this.syncUserContextCrossTabs(userContext);
        }
        break;
    }
  }

  private handleSessionEvent(event: any): void {
    switch (event.type) {
      case 'session_error':
      case 'session_terminated':
        console.warn('Session terminated, clearing user context');
        this.updateAuthState({ user: null, error: 'Session terminated' });
        this.clearCrossTabUserContext();
        break;
      case 'token_expires':
        console.info('Token expiring, automatic refresh should handle this');
        break;
    }
  }

  private setupCrossTabSync(): void {
    window.addEventListener('storage', (event) => this.handleStorageEvent(event));
    this.startTokenValidation();
  }

  private handleStorageEvent(event: StorageEvent): void {
    if (event.key !== this.crossTabStorageKey) return;

    const userData = event.newValue ? JSON.parse(event.newValue) : null;
    if (userData && userData !== this.currentUser()) {
      console.log('Cross-tab sync: User context updated from another tab');
      this.updateAuthState({ user: userData, error: null });
    } else if (!userData && this.currentUser()) {
      console.log('Cross-tab sync: User logged out in another tab');
      this.updateAuthState({ user: null, error: null });
    }
  }

  private startTokenValidation(): void {
    this.tokenCheckInterval = window.setInterval(
      () => this.validateToken(),
      clientAuthConfig.tokenValidationIntervalMs
    );
  }

  private async validateToken(): Promise<void> {
    if (this.oauthService.hasValidAccessToken()) return;

    console.warn('Token validation failed, checking for refresh token...');

    // Check if we can refresh the token
    const refreshToken = this.oauthService.getRefreshToken();
    if (!refreshToken) {
      console.warn('No refresh token available during validation, clearing session...');
      this.updateAuthState({
        user: null,
        error: 'Session expired - please log in again'
      });
      this.clearCrossTabUserContext();
      return;
    }

    try {
      await this.refreshToken();
      console.log('Token refresh successful during validation');
    } catch (error) {
      console.error('Token refresh failed during validation:', error);
      this.updateAuthState({
        user: null,
        error: 'Session expired - please log in again'
      });
      this.clearCrossTabUserContext();
    }
  }

  private stopTokenValidation(): void {
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
      this.tokenCheckInterval = undefined;
    }
  }

  private updateAuthState(updates: Partial<AuthState>): void {
    this.authState.update(current => ({ ...current, ...updates }));
  }

  private syncUserContextCrossTabs(userContext: UserContext | null): void {
    if (!clientAuthConfig.enableCrossTabSync) return;

    if (userContext) {
      localStorage.setItem(this.crossTabStorageKey, JSON.stringify(userContext));
    } else {
      this.clearCrossTabUserContext();
    }
  }

  private clearCrossTabUserContext(): void {
    localStorage.removeItem(this.crossTabStorageKey);
  }

  private buildUserContext(identityClaims: Record<string, any>): UserContext | null {
    if (!identityClaims) return null;

    return {
      id: identityClaims['sub'],
      name: identityClaims['name'],
      email: identityClaims['email'],
      roles: identityClaims['roles'] || []
    };
  }

  private setupTokenEventHandlers() {
    this.oauthService.events
      .pipe(
        tap((e: any) => clientAuthConfig.enableDebugLogging && console.log('OAuth Event:', e.type, e)),
        filter((e: any) => ['token_received', 'token_refreshed', 'user_profile_loaded'].includes(e.type))
      )
      .subscribe((event: any) => {
        console.log(`Processing OAuth event: ${event.type}`);
        this.handleOAuthEvent(event);
      });
  }

  private setupSessionEventHandlers() {
    this.oauthService.events
      .pipe(filter((e: any) => ['session_error', 'session_terminated', 'token_expires'].includes(e.type)))
      .subscribe((event: any) => {
        console.warn(`OAuth session event: ${event.type}`, event);
        this.handleSessionEvent(event);
      });
  }
}
