import { Routes } from '@angular/router';
import { AutoLoginPartialRoutesGuard } from 'angular-auth-oidc-client';

import { Home } from './components/home/home';

export const routes: Routes = [
  { path: '', component: Home, canActivate: [AutoLoginPartialRoutesGuard] },
];
