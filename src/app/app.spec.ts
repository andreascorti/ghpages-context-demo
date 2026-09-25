import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the context-path heading', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('GitHub Pages context-path demo');
  });

  it('should default to production environment at root base href', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as { environmentLabel: () => string };
    expect(app.environmentLabel()).toBe('production');
  });
});
