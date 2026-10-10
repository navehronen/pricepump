import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HereNotice } from '@/components/HereNotice';
import { ResultsSummary } from '@/components/ResultsSummary';

describe('fuel-content notices and summary', () => {
  it('shows counts and partial coverage without an aggregate fuel price', () => {
    const html = renderToStaticMarkup(createElement(ResultsSummary, { count: 50, hasPrices: true, complete: false, radius: 15, outerStatus: 'loaded' }));
    expect(html).toContain('50 stations loaded');
    expect(html).toContain('coverage is partial');
    expect(html).not.toMatch(/Avg\.|average|\$|\/gal/i);
  });
  it('retains the no-price explanation', () => {
    const html = renderToStaticMarkup(createElement(ResultsSummary, { count: 2, hasPrices: false, complete: true }));
    expect(html).toContain('No prices available');
  });
  it('provides HERE terms and privacy before search, and distinct data-source and supplier notices', () => {
    const search = renderToStaticMarkup(createElement(HereNotice, { search: true }));
    expect(search).toContain('https://legal.here.com/terms/here-end-user-terms');
    expect(search).toContain('https://legal.here.com/privacy');
    expect(search).toContain('By searching, you agree');
    const notice = renderToStaticMarkup(createElement(HereNotice));
    expect(notice).toContain('provided by HERE');
    expect(notice).toContain('OpenStreetMap contributors');
    expect(notice).toContain('https://legal.here.com/us-en/terms/general-content-supplier-terms-and-notices');
  });
});
