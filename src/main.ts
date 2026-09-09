import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';

/**
 * The one sanctioned `console` call outside `LoggerService`, because this catch runs when
 * bootstrap itself failed — most often because `assets/app-config.json` could not be loaded —
 * and at that point there is no injector, so there is no logger either.
 *
 * It also puts something on the page. Without that, a failed config load leaves the user a
 * blank white document with the reason visible only in devtools.
 */
bootstrapApplication(App, appConfig).catch((error: unknown) => {
  // eslint-disable-next-line no-console -- no injector exists once bootstrap has failed
  console.error('Application failed to start', error);

  const notice = document.createElement('p');
  notice.textContent = 'The application failed to start. See the browser console for details.';
  notice.setAttribute('style', 'font-family: system-ui, sans-serif; margin: 2rem;');
  document.body.appendChild(notice);
});
