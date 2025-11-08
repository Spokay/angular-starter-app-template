import { Routes } from '@angular/router';
import { ErrorPage } from '@components/error-page/error-page';
import { Home } from '@components/home/home';
import { LoginPage } from '@components/login-page/login-page.component';
import { AutoLoginPartialRoutesGuard } from 'angular-auth-oidc-client';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginPage },
  { path: 'home', component: Home, canActivate: [AutoLoginPartialRoutesGuard] },
  { path: 'unauthorized', component: ErrorPage, data: { statusCode: 401 } },
  { path: 'forbidden', component: ErrorPage, data: { statusCode: 403 } },
  { path: 'not-found', component: ErrorPage, data: { statusCode: 404 } },
  // Fallback route (404 page) - must be last
  { path: '**', component: ErrorPage, data: { statusCode: 404 } },
];
