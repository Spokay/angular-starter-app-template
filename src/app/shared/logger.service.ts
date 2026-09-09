import { Injectable, Injector, inject } from '@angular/core';
import { AppConfigService } from '@core/app-config.service';

import { environment } from '../../environments/environment';

/** Least to most severe; the configured level is the lowest one that is printed. */
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * The one place this app writes to the console. `no-console` in `eslint.config.js` keeps it
 * that way, with `src/main.ts` the single exception because its bootstrap catch runs before
 * dependency injection exists.
 *
 * The level comes from `logging.level` in `app-config.json`, so a deployed build can be made
 * verbose by editing a file rather than by rebuilding — the same reason the OIDC settings
 * live there.
 *
 * Two details are deliberate. `AppConfigService` is resolved through the `Injector` rather
 * than injected: that service logs as well, and an eager dependency both ways is a DI cycle.
 * And the level is read on every call rather than cached, because this logger is used from
 * the app initializer, which runs *before* `AppConfigService.load()` resolves.
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  private readonly injector = inject(Injector);

  debug(message: string, ...details: unknown[]): void {
    this.write('debug', message, details);
  }

  info(message: string, ...details: unknown[]): void {
    this.write('info', message, details);
  }

  warn(message: string, ...details: unknown[]): void {
    this.write('warn', message, details);
  }

  error(message: string, ...details: unknown[]): void {
    this.write('error', message, details);
  }

  /** The level in force right now: configured if the config has loaded, defaulted if not. */
  get level(): LogLevel {
    const configured = this.injector.get(AppConfigService).value?.logging?.level;
    if (configured && LOG_LEVELS.includes(configured)) {
      return configured;
    }
    return environment.production ? 'warn' : 'debug';
  }

  private write(level: LogLevel, message: string, details: unknown[]): void {
    if (LOG_LEVELS.indexOf(level) < LOG_LEVELS.indexOf(this.level)) {
      return;
    }
    // eslint-disable-next-line no-console -- the one sanctioned console call in the app
    console[level](`[${level}] ${message}`, ...details);
  }
}
