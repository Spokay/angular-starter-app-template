# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development Tasks
- `npm start` or `ng serve` - Start development server on http://localhost:4200
- `npm run build` or `ng build` - Build the application for production
- `npm test` or `ng test` - Run unit tests with Karma
- `npm run watch` or `ng build --watch --configuration development` - Build in watch mode for development

### Code Generation
- `ng generate component component-name` - Generate new components
- `ng generate --help` - List all available schematics

## Architecture Overview

This is an Angular 20 application implementing OAuth2/OIDC authentication using the `angular-oauth2-oidc` library.

### Authentication Architecture
- **OAuth Provider**: Configured to connect to `http://localhost:8083/api` (development identity server)
- **Client ID**: `angular-spa-client`
- **Flow**: Authorization Code Flow with PKCE
- **Scopes**: `openid profile email offline_access`
- **Storage**: Uses localStorage for token persistence
- **Auto-refresh**: Implements automatic silent token refresh with fallback mechanisms
- **Token Management**: Intelligent token refresh when `isLoggedIn=true` but `hasValidAccessToken()=false`

### Key Authentication Components
- `src/app/auth/auth.service.ts` - Main authentication service with user state management
- `src/app/auth/auth-config.ts` - OAuth configuration
- `src/app/auth/user.ts` - User context types
- `src/app/app.config.ts` - App initialization with auth setup

### Application Structure
- **Routing**: Simple route configuration in `src/app/app.routes.ts`
- **Components**: Feature components in `src/app/components/`
- **Proxy**: API proxy configuration in `src/proxy.conf.json` routes `/api/*` to the identity server

### Development Environment
- **Identity Server**: Requires local identity server running on port 8083
- **Proxy**: Development server proxies API calls to avoid CORS issues
- **HTTPS**: Disabled for local development (`requireHttps: false`)

### Signal-based State Management
The application uses Angular signals for reactive state management, particularly for user authentication state in `AuthService.currentUser`.