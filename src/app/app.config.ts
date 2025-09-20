import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { authInterceptor } from './services/auth.interceptor';

// export const appConfig: ApplicationConfig = {
//   providers: [
//     provideRouter(routes),
//     // Dùng XHR backend (KHÔNG withFetch) để có progress
//     provideHttpClient(withInterceptors([authInterceptor])),
//     //provideClientHydration(),
//     provideAnimationsAsync(),
//   ]
// };

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // BẬT fetch để hết NG02801 và thân thiện SSR
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor])
    ),
    provideClientHydration(),
    provideAnimationsAsync(),
  ]
};