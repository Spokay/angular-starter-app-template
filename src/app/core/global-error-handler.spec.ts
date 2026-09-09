import { TestBed } from '@angular/core/testing';
import { LoggerService } from '@shared/logger.service';

import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
  let logger: jasmine.SpyObj<LoggerService>;
  let handler: GlobalErrorHandler;

  beforeEach(() => {
    logger = jasmine.createSpyObj<LoggerService>('LoggerService', ['error']);
    TestBed.configureTestingModule({
      providers: [GlobalErrorHandler, { provide: LoggerService, useValue: logger }],
    });
    handler = TestBed.inject(GlobalErrorHandler);
  });

  it('sends an uncaught error to the logger', () => {
    const error = new Error('boom');

    handler.handleError(error);

    expect(logger.error).toHaveBeenCalledWith('Uncaught error', error);
  });
});
