import { ErrorHandler, Injectable, inject } from '@angular/core';
import { LoggerService } from '@shared/logger.service';

/**
 * Catches what nothing else does: an exception thrown in a component, a template, an effect,
 * or a subscription with no error callback. Angular's default handler writes it to the console
 * and no further, so a production failure leaves no trace anywhere a project collects.
 *
 * `provideBrowserGlobalErrorListeners()` in `app.config.ts` routes `window.onerror` and
 * unhandled promise rejections into whatever `ErrorHandler` is registered, so replacing the
 * handler picks those up as well.
 *
 * This is the hook to extend when the project has somewhere to send failures — Sentry, an
 * ingest endpoint, the resource server: log here, and report from here.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly logger = inject(LoggerService);

  handleError(error: unknown): void {
    this.logger.error('Uncaught error', error);
  }
}
