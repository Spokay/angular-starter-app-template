import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * HTTP interceptor that handles 401 (Unauthorized) and 403 (Forbidden) errors
 * by redirecting to the appropriate error pages.
 */
export const errorHandlingInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        void router.navigate(['/unauthorized']);
      }
      if (error.status === 403) {
        void router.navigate(['/forbidden']);
      }
      return throwError(() => error);
    }),
  );
};
