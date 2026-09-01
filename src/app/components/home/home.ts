import { AsyncPipe, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MusicService } from '@core/music.service';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: 'home.html',
  imports: [AsyncPipe, JsonPipe],
})
export class Home {
  private readonly oidcSecurityService = inject(OidcSecurityService);
  private readonly musicService = inject(MusicService);

  // Signals rather than a subscribe-into-a-field: they mark the view dirty on their own, so
  // this keeps working if the component ever moves to OnPush.
  readonly musics = signal<string[] | null>(null);
  readonly musicsError = signal<string | null>(null);

  configuration$ = this.oidcSecurityService.getConfiguration();

  userData$ = this.oidcSecurityService.userData$;

  // Bound through the async pipe rather than a manual subscription: under OnPush, writing
  // to a field from a subscribe callback does not mark the component dirty, so the view
  // would only update when some other binding happened to trigger a check.
  isAuthenticated$ = this.oidcSecurityService.isAuthenticated$.pipe(
    map(({ isAuthenticated }) => isAuthenticated),
  );

  /**
   * The one call that proves the whole setup: the OIDC interceptor attaches the access token
   * because the resource server's base URL is listed in `secureRoutes`.
   */
  loadMusics(): void {
    this.musicsError.set(null);
    this.musicService.list().subscribe({
      next: (musics) => this.musics.set(musics),
      error: (error: HttpErrorResponse) =>
        this.musicsError.set(`${error.status} ${error.statusText}`),
    });
  }

  login(): void {
    this.oidcSecurityService.authorize();
  }

  refreshSession(): void {
    this.oidcSecurityService.forceRefreshSession().subscribe((result) => console.log(result));
  }

  logout(): void {
    this.oidcSecurityService.logoff().subscribe((result) => console.log(result));
  }

  logoffAndRevokeTokens(): void {
    this.oidcSecurityService.logoffAndRevokeTokens().subscribe((result) => console.log(result));
  }

  revokeRefreshToken(): void {
    this.oidcSecurityService.revokeRefreshToken().subscribe((result) => console.log(result));
  }

  revokeAccessToken(): void {
    this.oidcSecurityService.revokeAccessToken().subscribe((result) => console.log(result));
  }
}
