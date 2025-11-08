import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface ErrorDetails {
  title: string;
  message: string;
  description?: string;
}

@Component({
  selector: 'app-error-page',
  imports: [RouterLink],
  templateUrl: './error-page.html',
  styleUrl: './error-page.css',
})
export class ErrorPage implements OnInit {
  statusCode: number = 500;
  errorDetails: ErrorDetails = this.getErrorDetails(500);

  private readonly errorMap: Record<number, ErrorDetails> = {
    400: {
      title: '400 - Bad Request',
      message: 'The request could not be understood by the server.',
      description: 'Please check your input and try again.',
    },
    401: {
      title: '401 - Unauthorized',
      message: 'You need to be authenticated to access this resource.',
      description: 'Please log in and try again.',
    },
    403: {
      title: '403 - Forbidden',
      message: 'You do not have permission to access this resource.',
      description: 'Contact your administrator if you believe this is an error.',
    },
    404: {
      title: '404 - Not Found',
      message: 'The page you are looking for could not be found.',
      description: 'The URL may be incorrect or the page may have been moved.',
    },
    500: {
      title: '500 - Internal Server Error',
      message: 'Something went wrong on our end.',
      description: 'Please try again later or contact support if the problem persists.',
    },
    502: {
      title: '502 - Bad Gateway',
      message: 'The server received an invalid response.',
      description: 'Please try again later.',
    },
    503: {
      title: '503 - Service Unavailable',
      message: 'The service is temporarily unavailable.',
      description: 'Please try again later.',
    },
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly location: Location,
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.statusCode = data['statusCode'] || 500;
      this.errorDetails = this.getErrorDetails(this.statusCode);
    });
  }

  goBack(): void {
    this.location.back();
  }

  private getErrorDetails(statusCode: number): ErrorDetails {
    return (
      this.errorMap[statusCode] || {
        title: `${statusCode} - Error`,
        message: 'An unexpected error has occurred.',
        description: 'Please try again later.',
      }
    );
  }
}
