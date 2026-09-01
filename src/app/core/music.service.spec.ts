import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { provideTestingEnvironment } from '../../testing/test-providers';

import { BaseService } from './base.service';
import { MusicService } from './music.service';

/** Exercises `BaseService.url()` with a slash on both sides of the join. */
class TrailingSlashService extends BaseService {
  protected readonly baseUrl = '/api/';

  musics() {
    return this.get<string[]>('/musics');
  }
}

describe('MusicService', () => {
  let service: MusicService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      // `provideHttpClientTesting` must come after `provideHttpClient` to replace its backend.
      providers: [provideTestingEnvironment(), provideHttpClientTesting()],
    });

    service = TestBed.inject(MusicService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('calls the API base URL from the runtime config', () => {
    let musics: string[] | undefined;
    service.list().subscribe((result) => (musics = result));

    const request = http.expectOne('/api/musics');
    expect(request.request.method).toBe('GET');

    request.flush(['Music 1', 'Music 2']);
    expect(musics).toEqual(['Music 1', 'Music 2']);
  });

  it('joins the path onto the base URL without doubling the slash', () => {
    const trailing = TestBed.runInInjectionContext(() => new TrailingSlashService());
    trailing.musics().subscribe();

    http.expectOne('/api/musics').flush([]);
  });
});
