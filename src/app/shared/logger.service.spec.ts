import { TestBed } from '@angular/core/testing';
import { AppConfig, AppConfigService } from '@core/app-config.service';

import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  /**
   * `value` is deliberately allowed to be undefined: that is what the real service returns
   * before the app initializer has finished, and the logger is used in that window.
   */
  function loggerWith(value: Partial<AppConfig> | undefined): LoggerService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: AppConfigService, useValue: { value } }],
    });
    return TestBed.inject(LoggerService);
  }

  it('prints a level at or above the configured one', () => {
    const logger = loggerWith({ logging: { level: 'warn' } });
    spyOn(console, 'warn');
    spyOn(console, 'error');

    logger.warn('kept');
    logger.error('kept');

    expect(console.warn).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('drops a level below the configured one', () => {
    const logger = loggerWith({ logging: { level: 'warn' } });
    spyOn(console, 'debug');
    spyOn(console, 'info');

    logger.debug('dropped');
    logger.info('dropped');

    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
  });

  it('falls back to debug in development when the config has not loaded yet', () => {
    expect(loggerWith(undefined).level).toBe('debug');
  });

  it('ignores a level the config invented', () => {
    // A config file is data, not code: it can carry a level TypeScript would never allow.
    const logger = loggerWith({ logging: { level: 'chatty' } } as unknown as Partial<AppConfig>);

    expect(logger.level).toBe('debug');
  });
});
