import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LoggerService } from '@shared/logger.service';

import { REQUEST_ID_HEADER, errorHandlingInterceptor } from './error-handling.interceptor';

describe('errorHandlingInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  let logger: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    logger = jasmine.createSpyObj<LoggerService>('LoggerService', ['warn', 'error']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorHandlingInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
        { provide: LoggerService, useValue: logger },
      ],
    });

    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  /** Swallows the rethrow: every one of these requests is meant to fail. */
  function failWith(status: number): void {
    http.get('/api/musics').subscribe({ next: () => undefined, error: () => undefined });
    backend.expectOne('/api/musics').flush('nope', { status, statusText: 'Failed' });
  }

  it('tags every request with an id', () => {
    http.get('/api/musics').subscribe();

    const request = backend.expectOne('/api/musics');
    expect(request.request.headers.get(REQUEST_ID_HEADER)).toBeTruthy();

    request.flush([]);
  });

  it('sends the user to the error page on 401', () => {
    failWith(401);

    expect(router.navigate).toHaveBeenCalledWith(['/unauthorized']);
  });

  it('sends the user to the error page on 403', () => {
    failWith(403);

    expect(router.navigate).toHaveBeenCalledWith(['/forbidden']);
  });

  /** A missing resource is the caller's problem to render, not a reason to leave the page. */
  it('logs a 404 without navigating', () => {
    failWith(404);

    expect(router.navigate).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs a server error at error level', () => {
    failWith(503);

    expect(logger.error).toHaveBeenCalled();
  });

  it('logs a request that never got a response at error level', () => {
    http.get('/api/musics').subscribe({ next: () => undefined, error: () => undefined });
    backend.expectOne('/api/musics').error(new ProgressEvent('error'));

    expect(logger.error).toHaveBeenCalled();
  });

  it('logs the same request id it sent', () => {
    http.get('/api/musics').subscribe({ next: () => undefined, error: () => undefined });
    const request = backend.expectOne('/api/musics');
    const sent = request.request.headers.get(REQUEST_ID_HEADER);
    request.flush('nope', { status: 500, statusText: 'Failed' });

    expect(logger.error).toHaveBeenCalledWith(
      jasmine.any(String),
      jasmine.objectContaining({ requestId: sent }),
    );
  });
});
