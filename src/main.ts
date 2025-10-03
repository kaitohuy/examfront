import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import { provideAnimations /* or provideNoopAnimations */ } from '@angular/platform-browser/animations';

registerLocaleData(localeVi);

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    provideAnimations(),                 // <-- thêm dòng này (hoặc provideNoopAnimations())
    ...(appConfig.providers || []),
    { provide: LOCALE_ID, useValue: 'vi' },
  ]
}).catch(err => console.error(err));
