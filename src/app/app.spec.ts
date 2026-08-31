import { TestBed } from '@angular/core/testing';

import { provideTestingEnvironment } from '../testing/test-providers';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideTestingEnvironment()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the app name in the header', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    // __APP_DISPLAY_NAME__ is replaced in both this spec and header.html when the CLI
    // scaffolds a project, so this assertion holds before and after templating.
    expect(compiled.querySelector('h1')?.textContent).toContain('__APP_DISPLAY_NAME__');
  });
});
