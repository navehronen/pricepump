import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { demoStations } from '../../src/lib/providers/demo';
import { coarseCenter, distanceMiles } from '../../src/lib/domain/stations';
const center = { lat:33.6846,lng:-117.8265 };
test.beforeAll(async ({request}) => {
  // Fail before any search if an externally managed test server is in live mode.
  const home = await request.get('/');
  expect(await home.text()).toContain('Fictional stations and prices near Irvine, CA.');
});
async function fixtureAPI(page: Page, data = demoStations()) {
  const requests: { url: string; body: Record<string, unknown> }[] = [];
  await page.route('**/api/**', async route => {
    const body = route.request().postDataJSON(); const url = new URL(route.request().url());
    requests.push({url:url.pathname,body});
    if (url.pathname.endsWith('/stations')) {
      const all = data.filter(s => distanceMiles(body.center,s.position) <= body.radius + (body.outer ? -.5 : .5));
      if (body.outer) all.sort((a,b)=>distanceMiles(body.center,b.position)-distanceMiles(body.center,a.position));
      const nextOffset = body.offset + 50 < all.length ? body.offset + 50 : null;
      await route.fulfill({json:{total:all.length,retrievedCount:Math.min(body.offset+50,all.length),stations:all.slice(body.offset,body.offset+50),nextOffset,complete:nextOffset===null,fetchedAt:new Date().toISOString()}});
    } else if (url.pathname.endsWith('/reverse')) await route.fulfill({json:{label:'Irvine, CA',countryCode:'USA'}});
    else await route.fulfill({json:{locations:[{id:'irvine',label:'Irvine, CA, USA',displayName:'Irvine, CA',position:center,countryCode:'USA'}]}});
  });
  return requests;
}
async function openDemo(page: Page) {
  await page.goto('/'); await page.getByRole('button',{name:'Explore the Irvine demo',exact:true}).click();
  await expect(page.locator('.station-card').first()).toBeVisible();
}
test('real demo endpoints: manual lookup, address ambiguity, and initial 20 results', async ({page}) => {
  await page.goto('/'); await page.getByLabel('Search by city, ZIP, or address').fill('Orange County');
  await page.getByRole('button',{name:'Search location',exact:true}).click();
  await expect(page.getByText('Choose your location')).toBeVisible();
  await page.getByRole('button',{name:'Irvine, CA, USA',exact:true}).click();
  await expect(page.locator('.station-card')).toHaveCount(20);
  await expect(page.locator('.results-summary')).not.toContainText(/Avg\.|average|\$|\/gal/i);
  await expect(page.locator('.tier-badge').filter({hasText:'Mid-range'}).first()).toBeVisible();
  await expect(page.getByRole('combobox',{name:'Fuel grade'})).toHaveValue('regular');
  await expect(page.getByRole('combobox',{name:'Sort by'})).toHaveValue('cheapest');
});
test('served API validates requests, blocks cross-site calls, and never serves environment files', async ({request}) => {
  const home = await request.get('/');
  expect(home.headers()['x-content-type-options']).toBe('nosniff');
  expect(home.headers()['x-frame-options']).toBe('DENY');
  expect(home.headers()['x-powered-by']).toBeUndefined();
  expect((await request.get('/.env.local')).status()).toBe(404);
  expect((await request.get('/api/stations')).status()).toBe(405);
  const body = {center:coarseCenter(center),radius:5,offset:0};
  expect((await request.post('/api/stations',{data:{...body,radius:500}})).status()).toBe(400);
  expect((await request.post('/api/stations',{data:body,headers:{origin:'https://unrelated.example'}})).status()).toBe(403);
  const first = await request.post('/api/stations',{data:body});
  expect(first.status()).toBe(200); expect(first.headers()['cache-control']).toBe('no-store');
  const second = await request.post('/api/stations',{data:{...body,center:{lat:33.681,lng:-117.831}}});
  expect(await second.json()).toEqual(await first.json());
});
test('local filters, sorting, list/map, details, and cached Show More do not request prices', async ({page}) => {
  const requests = await fixtureAPI(page); await openDemo(page);
  expect(requests).toHaveLength(1);
  await page.getByRole('button',{name:'Show More',exact:true}).click(); await expect(page.locator('.station-card')).toHaveCount(40);
  expect(requests).toHaveLength(1);
  await page.getByRole('combobox',{name:'Sort by'}).selectOption('nearest');
  const distances = await page.locator('.station-meta').allTextContents();
  expect(parseFloat(distances[0])).toBeLessThanOrEqual(parseFloat(distances[1]));
  await page.getByRole('combobox',{name:'Fuel grade'}).selectOption('premium');
  await page.getByRole('button',{name:'Brands Any Brand'}).click();
  await page.getByRole('checkbox',{name:'Shell',exact:true}).check(); await page.getByRole('checkbox',{name:'ARCO',exact:true}).check();
  await page.getByRole('button',{name:'Done',exact:true}).click();
  await expect(page.getByRole('button',{name:'Brands 2 Brands'})).toBeVisible();
  for (const text of await page.locator('.station-title').allTextContents()) expect(['Shell','ARCO']).toContain(text);
  await page.locator('.station-title').first().click(); await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('link',{name:'Google Maps'})).toHaveAttribute('href',/destination=/);
  await expect(page.getByRole('link',{name:'Apple Maps'})).toHaveAttribute('href',/destination=/);
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'Map',exact:true}).click();
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  const map = page.locator('.leaflet-container'); const box = await map.boundingBox();
  await page.mouse.move(box!.x+100,box!.y+100); await page.mouse.down(); await page.mouse.move(box!.x+200,box!.y+160); await page.mouse.up();
  await page.getByRole('button',{name:'List',exact:true}).click();
  await expect(page.locator('.station-card').first()).toBeVisible(); expect(requests).toHaveLength(1);
});
test('Show More fetches one additional page only when local results run out', async ({page}) => {
  const requests = await fixtureAPI(page,demoStations().map(s=>({...s,position:{lat:center.lat+(s.position.lat-center.lat)/3,lng:center.lng+(s.position.lng-center.lng)/3}}))); await openDemo(page);
  await expect(page.locator('.station-card')).toHaveCount(20); expect(requests).toHaveLength(1);
  await page.getByRole('button',{name:'Show More',exact:true}).click(); await expect(page.locator('.station-card')).toHaveCount(40);
  await page.getByRole('button',{name:'Show More',exact:true}).click(); await expect(page.locator('.station-card')).toHaveCount(50); expect(requests).toHaveLength(1);
  await page.getByRole('button',{name:'Show More',exact:true}).click(); await expect(page.locator('.station-card')).toHaveCount(70); expect(requests).toHaveLength(2);
  await page.getByRole('button',{name:'Show More',exact:true}).click(); await expect(page.locator('.station-card')).toHaveCount(76); expect(requests).toHaveLength(2);
  expect(requests[1].body.offset).toBe(50);
  await page.getByRole('combobox',{name:'Radius',exact:true}).selectOption('5'); expect(requests).toHaveLength(2);
});
test('missing and stale prices remain visible and unavailable prices sort last', async ({page}) => {
  const source = demoStations(); const data = [source[0],source[1],source[9],source[13]];
  await fixtureAPI(page,data); await openDemo(page);
  await expect(page.getByText('Price may be outdated',{exact:true})).toBeVisible();
  await expect(page.getByText('Price is over 2 days old',{exact:true})).toBeVisible();
  await expect(page.locator('.station-card').last()).toContainText('Price unavailable');
  await expect(page.locator('.station-card').last().locator('.tier-badge')).toHaveCount(0);
  await page.getByRole('combobox',{name:'Sort by'}).selectOption('nearest');
  await expect(page.locator('.station-card').last()).toContainText('Price unavailable');
});
test('successful browser location is rounded before API calls and is never persisted', async ({page,context}) => {
  await context.grantPermissions(['geolocation']); await context.setGeolocation({latitude:center.lat,longitude:center.lng});
  const requests = await fixtureAPI(page); await page.goto('/'); await page.getByRole('button',{name:'Use My Location',exact:true}).click();
  await expect(page.locator('.station-card')).toHaveCount(20);
  expect(requests.find(r=>r.url==='/api/stations')?.body.center).toEqual(coarseCenter(center));
  expect(requests.find(r=>r.url==='/api/reverse')?.body.center).toEqual(coarseCenter(center));
  const storage = await page.evaluate(() => JSON.stringify(localStorage)); expect(storage).not.toContain(String(center.lat)); expect(storage).not.toContain(String(center.lng));
});
for (const [code,message] of [[1,'Location access is off.'],[2,'We couldn’t find your location.'],[3,'Location took too long.']] as const) {
  test(`location error ${code} offers manual recovery`, async ({page}) => {
    await page.addInitScript(code => { Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition: (_success: unknown, failure: (reason: {code: number})=>void) => failure({code})}}); },code);
    await page.goto('/'); await page.getByRole('button',{name:'Use My Location',exact:true}).click();
    await expect(page.getByRole('alert').filter({hasText:message})).toBeVisible(); await expect(page.getByLabel('Search by city, ZIP, or address')).toBeVisible();
  });
}
test('API failures are recoverable without displaying raw provider errors', async ({page}) => {
  await page.route('**/api/stations',route=>route.fulfill({status:503,json:{error:'SECRET_UPSTREAM_ERROR'}}));
  await page.goto('/'); await page.getByRole('button',{name:'Explore the Irvine demo',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:"We couldn't load current prices. Try again."})).toBeVisible();
  await expect(page.locator('body')).not.toContainText('SECRET_UPSTREAM_ERROR');
  await fixtureAPI(page); await page.getByRole('button',{name:'Try again',exact:true}).click(); await expect(page.locator('.station-card')).toHaveCount(20);
});
test('empty results offer radius and brand recovery', async ({page}) => {
  await fixtureAPI(page,[]); await page.goto('/'); await page.getByRole('button',{name:'Explore the Irvine demo',exact:true}).click();
  await expect(page.getByText('No matching stations found within 5 miles.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Increase radius to 10 miles'})).toBeVisible();
});
test('preferences restore on later visits without restoring a location', async ({page}) => {
  await fixtureAPI(page); await openDemo(page); await page.getByRole('combobox',{name:'Fuel grade'}).selectOption('premium'); await page.getByRole('combobox',{name:'Sort by'}).selectOption('nearest');
  await page.reload(); await expect(page.getByRole('heading',{name:'Where are you filling up?'})).toBeVisible();
  await page.getByRole('button',{name:'Explore the Irvine demo',exact:true}).click();
  await expect(page.getByRole('combobox',{name:'Fuel grade'})).toHaveValue('premium'); await expect(page.getByRole('combobox',{name:'Sort by'})).toHaveValue('nearest');
  const data = await page.evaluate(()=>JSON.parse(localStorage.getItem('price-pump.preferences.v1')!)); expect(Object.keys(data).sort()).toEqual(['brands','fuel','radius','sort']);
});
test('brands support Any Brand, Select All, and Clear', async ({page}) => {
  await fixtureAPI(page); await openDemo(page); await page.getByRole('button',{name:'Brands Any Brand'}).click();
  await page.getByRole('button',{name:'Select All',exact:true}).click(); await expect(page.getByRole('checkbox',{checked:true})).toHaveCount(8);
  await page.getByRole('button',{name:'Clear',exact:true}).click(); await expect(page.getByRole('checkbox',{name:'Any Brand',exact:true})).toBeChecked();
  await page.getByRole('checkbox',{name:'Shell',exact:true}).check(); await page.getByRole('checkbox',{name:'Any Brand',exact:true}).check(); await expect(page.getByRole('checkbox',{name:'Shell',exact:true})).not.toBeChecked();
});
test('responsive phone and desktop layouts, enlarged text, and keyboard dialog focus', async ({page}) => {
  await fixtureAPI(page); await page.setViewportSize({width:390,height:844}); await page.goto('/');
  await expect(page.getByRole('button',{name:'Use My Location',exact:true})).toBeEnabled();
  await page.screenshot({path:'docs/screenshots/mobile-home.png',fullPage:true});
  await page.getByRole('button',{name:'Explore the Irvine demo',exact:true}).click(); await expect(page.locator('.station-card')).toHaveCount(20);
  await page.screenshot({path:'docs/screenshots/mobile-results.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.station-title').first().focus(); await page.keyboard.press('Enter'); await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.locator('.station-title').first()).toBeFocused();
  await page.addStyleTag({content:'html { font-size: 200%; }'}); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.reload(); await page.setViewportSize({width:1440,height:1000}); await page.getByRole('button',{name:'Explore the Irvine demo',exact:true}).click(); await expect(page.locator('.station-card')).toHaveCount(20);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'docs/screenshots/desktop-results.png'});
});
test('automated accessibility checks on home, results, and station details', async ({page}) => {
  await fixtureAPI(page); await page.goto('/');
  await expect(page.getByRole('button',{name:'Use My Location',exact:true})).toBeEnabled();
  const check = async () => {
    const {violations} = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(violations.map(v=>({id:v.id,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([]);
  };
  await check(); await page.getByRole('button',{name:'Explore the Irvine demo',exact:true}).click(); await expect(page.locator('.station-card')).toHaveCount(20);
  await check(); await page.locator('.station-title').first().click(); await expect(page.getByRole('dialog')).toBeVisible(); await check();
});
test('mobile accessibility includes all price tiers, brand menu, and map previews', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await fixtureAPI(page); await openDemo(page);
  const check = async () => {
    const {violations} = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([]);
  };
  await page.getByRole('button',{name:'Show More',exact:true}).click();
  await page.getByRole('button',{name:'Show More',exact:true}).click();
  await expect(page.getByText('Very High',{exact:true}).first()).toBeVisible();
  await check();
  await page.getByRole('button',{name:'Brands Any Brand'}).click(); await check();
  await page.getByRole('button',{name:'Done',exact:true}).click();
  await page.getByRole('button',{name:'Map',exact:true}).click();
  await expect(page.locator('.map-price-pin').first()).toBeVisible(); await check();
  await page.locator('.leaflet-marker-icon').first().focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('button',{name:'View station',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'View station',exact:true}).click(); await expect(page.getByRole('dialog')).toBeVisible(); await check();
  await page.getByRole('button',{name:'Close station details'}).click();
  await expect(page.getByRole('button',{name:'View station',exact:true})).toBeFocused();
  await expect(page.getByRole('link',{name:'OpenStreetMap',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'docs/screenshots/mobile-map.png',fullPage:true});
});

test('failed next page preserves results and retries the same offset', async ({page}) => {
  const requests = await fixtureAPI(page,demoStations().map(s=>({...s,position:{lat:center.lat+(s.position.lat-center.lat)/3,lng:center.lng+(s.position.lng-center.lng)/3}}))); await openDemo(page);
  await expect(page.locator('.station-card')).toHaveCount(20);
  await page.getByRole('button',{name:'Show More',exact:true}).click();
  await page.getByRole('button',{name:'Show More',exact:true}).click();
  await expect(page.locator('.station-card')).toHaveCount(50);
  await page.route('**/api/stations',async route=>{
    if(route.request().postDataJSON().offset===50) await route.fulfill({status:503,json:{error:'upstream unavailable'}});
    else await route.fallback();
  },{times:1});
  await page.getByRole('button',{name:'Show More',exact:true}).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText("We couldn't load current prices.");
  await expect(page.locator('.station-card')).toHaveCount(50);
  await page.getByRole('button',{name:'Try again',exact:true}).click();
  await expect(page.locator('.station-card')).toHaveCount(70);
  expect(requests.at(-1)?.body.offset).toBe(50);
});

for(const failure of ['offline','limited'] as const) {
  test(`${failure} station search has a safe recovery message`,async ({page})=>{
    await page.route('**/api/stations',route=>failure==='offline'?route.abort('internetdisconnected'):route.fulfill({status:429,json:{error:'internal details'}}));
    await page.goto('/'); await page.getByRole('button',{name:'Explore the Irvine demo',exact:true}).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText(failure==='offline'?"We couldn't load current prices. Try again.":'Too many searches. Please wait a minute');
    await expect(page.locator('body')).not.toContainText('Failed to fetch');
  });
}

test('manual lookup handles no match and service failure',async ({page})=>{
  await page.route('**/api/geocode',route=>route.fulfill({json:{locations:[]}}));
  await page.goto('/'); await page.getByLabel('Search by city, ZIP, or address').fill('Unknown location');
  await page.getByRole('button',{name:'Search location',exact:true}).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('This demo covers Irvine');
  await page.route('**/api/geocode',route=>route.fulfill({status:503,json:{error:'private upstream details'}}));
  await page.getByRole('button',{name:'Search location',exact:true}).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText("We couldn't load current prices.");
  await expect(page.locator('body')).not.toContainText('private upstream details');
});

test('map tile outage retains station pins and list recovery',async ({page})=>{
  await fixtureAPI(page); await page.route('https://tile.openstreetmap.org/**',route=>route.abort());
  await openDemo(page); await page.getByRole('button',{name:'Map',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'map background'})).toBeVisible();
  await expect(page.locator('.map-price-pin').first()).toBeVisible();
  await page.getByRole('button',{name:'List',exact:true}).click(); await expect(page.locator('.station-card')).toHaveCount(20);
});

test('small phone layout and Apple navigation preference',async ({page})=>{
  await page.setViewportSize({width:320,height:740});
  await page.addInitScript(()=>Object.defineProperty(navigator,'userAgent',{value:'iPhone'}));
  await fixtureAPI(page); await openDemo(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Directions',exact:true}).first().click();
  await expect(page.locator('.navigation-options a').first()).toHaveText('Apple Maps');
  await expect(page.getByRole('link',{name:'Google Maps'})).toHaveAttribute('href',/^https:\/\/www.google.com\/maps\/dir\/\?api=1&destination=/);
  await expect(page.getByRole('link',{name:'Apple Maps'})).toHaveAttribute('href',/^https:\/\/maps.apple.com\/directions\?destination=/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

for (const width of [390,393,1440]) {
  test(`Brands and station dialogs fit the viewport at ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height:844});
    await fixtureAPI(page); await openDemo(page);
    const contained = async (selector: string) => {
      const box=await page.locator(selector).boundingBox();
      expect(box).not.toBeNull(); expect(box!.x).toBeGreaterThanOrEqual(8); expect(box!.y).toBeGreaterThanOrEqual(8);
      expect(box!.x+box!.width).toBeLessThanOrEqual(width-8); expect(box!.y+box!.height).toBeLessThanOrEqual(836);
    };
    await page.getByRole('button',{name:'Brands Any Brand'}).click(); await contained('.brand-menu');
    await expect(page.getByRole('button',{name:'Select All',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Select All',exact:true}).click();
    await page.getByRole('button',{name:'Clear',exact:true}).click();
    await expect(page.getByRole('checkbox',{name:'Any Brand',exact:true})).toBeChecked();
    await page.screenshot({path:`docs/screenshots/brands-${width}.png`});
    await page.getByRole('button',{name:'Done',exact:true}).click();
    await page.locator('.station-title').first().click(); await contained('.station-dialog');
    const box=await page.getByRole('dialog').boundingBox();
    expect(Math.abs(box!.y+box!.height/2-422)).toBeLessThan(3);
    await expect(page.getByRole('dialog').getByRole('button',{name:'Directions',exact:true})).toHaveCount(0);
    await page.getByRole('link',{name:'Apple Maps',exact:true}).scrollIntoViewIfNeeded();
    await contained('.station-dialog');
    expect(await page.getByRole('dialog').evaluate(el=>el.scrollTop)).toBeGreaterThanOrEqual(0);
    await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Map',exact:true}).click();
    await page.locator('.leaflet-marker-icon').first().click();
    await page.getByRole('button',{name:'View station',exact:true}).click();
    await contained('.station-dialog');
    await expect(page.getByRole('dialog').getByRole('button',{name:'Directions',exact:true})).toHaveCount(0);
    await page.screenshot({path:`docs/screenshots/station-dialog-${width}.png`});
    await page.setViewportSize({width,height:480});
    await page.getByRole('link',{name:'Apple Maps',exact:true}).scrollIntoViewIfNeeded();
    const short=await page.getByRole('dialog').boundingBox();
    expect(short!.y).toBeGreaterThanOrEqual(8); expect(short!.y+short!.height).toBeLessThanOrEqual(472);
    expect(await page.getByRole('dialog').evaluate(el=>el.scrollHeight>el.clientHeight&&el.scrollTop>0)).toBe(true);
  });
}

test('list and map expose the same precise navigation destination without a duplicate control',async ({page})=>{
  const sample={...demoStations()[0],position:{lat:33.684678,lng:-117.826589}};
  await fixtureAPI(page,[sample]); await openDemo(page);
  await page.getByRole('button',{name:'Directions',exact:true}).click();
  const readLinks=async()=>{
    const values=[];
    for(const name of ['Google Maps','Apple Maps']) {
      const href=await page.getByRole('link',{name,exact:true}).getAttribute('href'); const url=new URL(href!);
      expect(url.searchParams.get('destination')).toBe('33.684678,-117.826589');
      expect(url.searchParams.has('source')).toBe(false); expect(url.searchParams.has('source-place-id')).toBe(false); expect(url.searchParams.has('origin')).toBe(false); values.push(href);
    }
    expect(await page.getByRole('dialog').getByRole('button',{name:'Directions',exact:true}).count()).toBe(0); return values;
  };
  await expect(page.getByText('Apple Maps web may need you to select My Location in the From field and allow location access.',{exact:true})).toBeVisible();
  const listLinks=await readLinks(); await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Map',exact:true}).click(); await page.locator('.leaflet-marker-icon').first().click();
  await page.getByRole('button',{name:'View station',exact:true}).click(); expect(await readLinks()).toEqual(listLinks);
});

test('radius changes immediately sample outer stations with bounded calls and preserve pagination',async ({page})=>{
  const sample=demoStations()[0];
  const stations=Array.from({length:210},(_,i)=>({...sample,id:`wide-${i}`,name:`Station ${i}`,position:{lat:center.lat+(i<100?1:i<160?7:12)/69.1,lng:center.lng}}));
  const requests=await fixtureAPI(page,stations); await openDemo(page);
  await page.getByRole('button',{name:'Map',exact:true}).click();
  await expect(page.locator('.map-price-pin')).toHaveCount(50); expect(requests).toHaveLength(1);
  const inspectPin=async (name:string,distance:string)=>{ await page.locator(`.leaflet-marker-icon[title^="${name}:"]`).press('Enter'); await expect(page.locator('.station-popup')).toContainText(distance); await page.locator('.leaflet-popup-close-button').click(); };
  await inspectPin('Station 0','1.0 mi');
  await page.getByRole('combobox',{name:'Radius',exact:true}).selectOption('10');
  await expect(page.locator('.map-price-pin')).toHaveCount(100); await inspectPin('Station 149','7.0 mi'); expect(requests).toHaveLength(3);
  await page.getByRole('combobox',{name:'Radius',exact:true}).selectOption('15');
  await expect(page.locator('.map-price-pin')).toHaveCount(100); await inspectPin('Station 209','12.0 mi'); expect(requests).toHaveLength(5);
  await expect(page.getByText('an outer-area sample',{exact:false})).toBeVisible();
  await page.getByRole('combobox',{name:'Radius',exact:true}).selectOption('10');
  await expect(page.locator('.map-price-pin')).toHaveCount(100); await expect(page.locator('.leaflet-marker-icon[title^="Station 209:"]')).toHaveCount(0); expect(requests).toHaveLength(5);
  await page.getByRole('combobox',{name:'Radius',exact:true}).selectOption('15'); await expect(page.locator('.map-price-pin')).toHaveCount(100); expect(requests).toHaveLength(5);
  await page.screenshot({path:'docs/screenshots/radius-15-sample.png'});
  for(let i=0;i<3;i++) await page.getByRole('button',{name:'Show More',exact:true}).click();
  await expect(page.locator('.map-price-pin')).toHaveCount(210); expect(requests.at(-1)?.body.offset).toBe(150); expect(requests.at(-1)?.body.radius).toBe(15);
  if(await page.getByRole('button',{name:'Show More',exact:true}).isVisible()) await page.getByRole('button',{name:'Show More',exact:true}).click();
  // All sampled pins can be present before the last page confirms complete coverage.
  // Wait for completion before testing reuse of the fully loaded larger radius.
  await expect(page.locator('.results-summary')).toContainText('210 stations found');
  await expect(page.getByRole('button',{name:'Show More',exact:true})).toHaveCount(0);
  await page.getByRole('combobox',{name:'Radius',exact:true}).selectOption('10'); await expect(page.locator('.map-price-pin')).toHaveCount(160);
  const count=requests.length;
  await page.getByRole('combobox',{name:'Radius',exact:true}).selectOption('5'); await expect(page.locator('.map-price-pin')).toHaveCount(100); expect(requests).toHaveLength(count);
});

test('outer-sample failure keeps nearest stations and does not retry automatically',async ({page})=>{
  const requests=await fixtureAPI(page); let attempts=0;
  await page.route('**/api/stations',route=>{if(route.request().postDataJSON().outer){attempts++;return route.fulfill({status:503,json:{error:'unavailable'}});}return route.fallback();});
  await openDemo(page); await page.getByRole('combobox',{name:'Radius',exact:true}).selectOption('15');
  await expect(page.locator('.station-card')).toHaveCount(20); await expect(page.getByText('The outer-area sample could not load.',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Map',exact:true}).click(); await expect(page.locator('.map-price-pin')).toHaveCount(50);
  await page.getByRole('button',{name:'Show More',exact:true}).click(); await expect(page.locator('.map-price-pin')).toHaveCount(76); expect(attempts).toBe(1); expect(requests.at(-1)?.body.offset).toBe(50);
});

test('provider pagination cutoff stays labeled partial and does not offer a dead fetch',async ({page})=>{
  await fixtureAPI(page);
  await page.route('**/api/stations',route=>route.fulfill({json:{stations:demoStations().slice(0,1),nextOffset:null,complete:false,total:200,retrievedCount:150,limitReason:'provider',fetchedAt:new Date().toISOString()}}));
  await openDemo(page); await expect(page.getByText('1 stations loaded',{exact:true})).toBeVisible();
  await expect(page.getByText('The provider ended pagination',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'Show More',exact:true})).toHaveCount(0);
});
