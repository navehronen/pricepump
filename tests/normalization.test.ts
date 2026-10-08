import { describe, expect, it } from 'vitest';
import { normalizeBrand, normalizeLocations, normalizePage, normalizeStation, normalizeTimestamp } from '@/lib/providers/normalize';
const base = { id:'station-1',name:'Shell',brand:'SHELL',position:{lat:33.68,lng:-117.83},address:{label:'123 Example St, Irvine, CA',city:'Irvine',state:'CA',postalCode:'92606',countryCode:'USA'} };
const price = { fuelType:'2',price:4.299,unit:'gal',currency:'USD',modified:'2026-09-28T10:00:00Z' };
describe('HERE normalization', () => {
  it('maps documented regular/mid-grade/premium IDs and ignores diesel and cash-only grades', () => {
    const s = normalizeStation({ ...base,prices:[price,{...price,fuelType:'3',price:4.5},{...price,fuelType:'4',price:4.8},{...price,fuelType:'1',price:3},{...price,fuelType:'78',price:1}] })!;
    expect(s.prices.regular?.amount).toBe(4.299); expect(s.prices.midgrade?.amount).toBe(4.5); expect(s.prices.premium?.amount).toBe(4.8); expect(s.brand).toBe('Shell');
  });
  it('converts USD per liter into US gallons', () => expect(normalizeStation({...base,prices:[{...price,price:1,unit:'l'}]})?.prices.regular?.amount).toBeCloseTo(3.785411784));
  it('retains stations but rejects unknown units/currencies, nonpositive values and unavailable prices', () => {
    for (const p of [{...price,unit:'unknown'},{...price,currency:'CAD'},{...price,price:0},{...price,price:-5},{...price,price:'4.20'},{...price,available:false}]) expect(normalizeStation({...base,prices:[p]})?.prices).toEqual({});
  });
  it('uses price timestamps, never station modification timestamps', () => expect(normalizeStation({...base,modified:price.modified,prices:[{...price,modified:undefined}]})?.prices.regular?.updatedAt).toBeNull());
  it('chooses the most recently updated valid duplicate grade', () => expect(normalizeStation({...base,prices:[{...price,modified:'2026-09-27T00:00:00Z'}, {...price,price:5}]})?.prices.regular?.amount).toBe(5));
  it('retains unpriced stations and drops foreign or unlocatable stations', () => {
    expect(normalizeStation(base)?.prices).toEqual({}); expect(normalizeStation({...base,address:{countryCode:'CAN'}})).toBeNull(); expect(normalizeStation({...base,position:{lat:100,lng:0}})).toBeNull();
  });
  it('normalizes known brand aliases without guessing unrelated brands', () => { expect(normalizeBrand('7 ELEVEN')).toBe('7-Eleven'); expect(normalizeBrand('COSTCO GASOLINE')).toBe('Costco'); expect(normalizeBrand('Local Fuel')).toBe('Local Fuel'); });
  it('requires timezone-qualified timestamps', () => { expect(normalizeTimestamp('2026-09-28T08:00:00-0700')).toBe('2026-09-28T15:00:00.000Z'); expect(normalizeTimestamp('2026-09-28T08:00:00')).toBeNull(); });
  it('preserves a valid price when the provider sends a null timestamp', () => {
    const result = normalizeStation({...base,prices:[{...price,modified:null}]});
    expect(result?.prices.regular?.amount).toBe(4.299);
    expect(result?.prices.regular?.updatedAt).toBeNull();
  });
  it('retains stations with null optional fields and prices', () => {
    const result = normalizeStation({...base,name:null,brand:null,prices:null,address:{...base.address,label:null,postalCode:null}});
    expect(result?.name).toBe('Independent'); expect(result?.prices).toEqual({});
  });
  it('does not resolve unknown provider values through object prototypes', () => {
    expect(normalizeBrand('constructor')).toBe('constructor');
    expect(normalizeStation({...base,prices:[{...price,fuelType:'constructor'},{...price,fuelType:'__proto__'}]})?.prices).toEqual({});
  });
  it('normalizes and deduplicates paginated envelopes', () => {
    const page = normalizePage({stations:[base,base],nextOffset:50,total:100,count:2},0);
    expect(page.stations).toHaveLength(1); expect(page.nextOffset).toBe(50); expect(page.complete).toBe(false);
    expect(normalizePage({stations:[],total:0},0).complete).toBe(true);
  });
  it('rejects malformed envelopes and non-advancing cursors', () => { expect(() => normalizePage({},0)).toThrow(); expect(() => normalizePage({stations:[base],nextOffset:0},0)).toThrow(); });
  it('continues beyond 150 and retains provider totals for partial-result messaging', () => {
    const page = normalizePage({stations:[base],nextOffset:200,total:543},150);
    expect(page.nextOffset).toBe(200); expect(page.complete).toBe(false); expect(page.total).toBe(543); expect(page.retrievedCount).toBe(151);
  });
  it('does not call a provider-truncated page complete', () => {
    const page = normalizePage({stations:[base],nextOffset:null,total:200},149);
    expect(page.nextOffset).toBeNull(); expect(page.complete).toBe(false); expect(page.limitReason).toBe('provider');
  });
  it('retains the safety ceiling while explicitly marking incomplete coverage', () => {
    const page = normalizePage({stations:[base],nextOffset:10050,total:20000},10000);
    expect(page.nextOffset).toBeNull(); expect(page.complete).toBe(false); expect(page.limitReason).toBe('safety');
  });
  it('normalizes address search candidates', () => {
    const result = normalizeLocations({items:[{id:'place-1',title:'Irvine',position:base.position,address:{countryCode:'USA',city:'Irvine',stateCode:'CA'}}]});
    expect(result[0].displayName).toBe('Irvine, CA'); expect(result[0].position).toEqual(base.position);
  });
});
