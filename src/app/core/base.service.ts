import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';

/** The subset of `HttpClient`'s options a service normally needs. */
export interface RequestOptions {
  headers?: HttpHeaders | Record<string, string | string[]>;
  params?: HttpParams | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;
  context?: HttpContext;
}

/**
 * HTTP plumbing shared by every service that talks to an API.
 *
 * It deliberately knows no URL of its own: each implementation declares its `baseUrl`, so a
 * service pointing at the resource server this app was scaffolded against and one pointing
 * at a third-party API are the same kind of object. Paths handed to the methods below are
 * joined onto that base.
 *
 * The methods are `protected` on purpose. A service exposes its own domain API —
 * `list()`, `save(track)` — rather than a raw HTTP surface its callers have to assemble
 * paths for.
 *
 * ```ts
 * @Injectable({ providedIn: 'root' })
 * export class MusicService extends BaseService {
 *   protected readonly baseUrl = inject(AppConfigService).value.resourceServer.baseUrl;
 *
 *   list(): Observable<string[]> {
 *     return this.get<string[]>('musics');
 *   }
 * }
 * ```
 *
 * `inject()` works here because implementations are `providedIn: 'root'`, so the base
 * constructor runs inside an injection context.
 */
export abstract class BaseService {
  protected readonly http = inject(HttpClient);

  /** Where this service's endpoints live. Implementations decide. */
  protected abstract readonly baseUrl: string;

  protected get<T>(path = '', options?: RequestOptions): Observable<T> {
    return this.http.get<T>(this.url(path), options);
  }

  protected post<T>(path: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.post<T>(this.url(path), body, options);
  }

  protected put<T>(path: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.put<T>(this.url(path), body, options);
  }

  protected patch<T>(path: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.patch<T>(this.url(path), body, options);
  }

  protected delete<T>(path: string, options?: RequestOptions): Observable<T> {
    return this.http.delete<T>(this.url(path), options);
  }

  /**
   * Join `path` onto `baseUrl`, tolerating a trailing slash on one, a leading slash on the
   * other, both, or neither — the base comes from runtime configuration, so its exact shape
   * is not this class's to dictate.
   */
  protected url(path: string): string {
    if (!path) return this.baseUrl;
    return `${this.baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  }
}
