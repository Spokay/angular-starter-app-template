import { Injectable, inject } from '@angular/core';
import { AppConfigService } from '@core/app-config.service';
import { Observable } from 'rxjs';

import { BaseService } from './base.service';

/**
 * The worked example of calling the resource server.
 *
 * `GET /musics` requires the `musics:read` scope, so the access token has to reach it — the
 * library's interceptor attaches it because `baseUrl` is covered by `secureRoutes`. Nothing
 * here names a URL: the base comes from `app-config.json`, swapped per environment without
 * a rebuild.
 */
@Injectable({ providedIn: 'root' })
export class MusicService extends BaseService {
  protected readonly baseUrl = inject(AppConfigService).value.resourceServer.baseUrl;

  list(): Observable<string[]> {
    return this.get<string[]>('musics');
  }
}
