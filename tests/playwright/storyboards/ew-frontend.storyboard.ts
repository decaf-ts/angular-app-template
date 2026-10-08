import path from 'path';
import type { Page, Route } from '@playwright/test';
import type {
  StoryboardConfig,
  StoryboardFrameWait,
  StoryboardScenario,
  StoryboardSection,
} from '../utils/storyboard';

/**
 * EW Frontend storyboard.
 *
 * This is the only file a project changes to reuse the generic storyboard runner
 * (`../utils/storyboard.ts`) and its Playwright test
 * (`../e2e/storyboard.test.ts`). Everything the guide needs -- route, actions,
 * highlights, copy -- lives here.
 *
 * The app under test is the Enterprise Wallet (EW) frontend, an Angular/Ionic
 * application backed by the PLA/EPI namespaces. No live backend stack runs while the
 * guide is generated, so the scenarios install a deterministic network-level mock of
 * the backend (`installMockBackend`): the runtime `window.ENV` is injected before
 * the bundle boots, authentication is answered with a signed-for-testing JWT, and
 * every repository endpoint returns a representative fixture.
 *
 * Dense forms are split into several focused scenarios so that each screenshot has
 * a small, non-overlapping set of numbered highlights. The matching numbered
 * legend is written in the scenario notes.
 */

const baseUrl =
  process.env['STORYBOARD_BASE_URL'] ??
  process.env['PLAYWRIGHT_BASE_URL'] ??
  'http://localhost:8130';

const GUIDE_DIR = 'workdocs/confluence/EW Frontend Design Specifications';
const SCREENSHOTS_DIR = path.posix.join(GUIDE_DIR, 'screenshots');
const GUIDE_FILE = path.posix.join(GUIDE_DIR, 'angular-template_06_User_Manual.md');

const MOCK_HOST = 'localhost:9999';

/**
 * Shared wait for the Kibana dashboard embedded in the wallet. It covers the
 * whole render chain -- frame element, embedded document load, the dashboard's own
 * loading indicators and the rendered panels -- and must be attached to every
 * scenario that captures an iframe-embedded dashboard (the Kibana dashboard here
 * and the AstraTrace dashboard if it is re-enabled), so no capture races the
 * dashboard's render cycle.
 */
const KIBANA_DASHBOARD_FRAME = 'iframe[title="Kibana Dashboard"]';
const KIBANA_DASHBOARD_WAIT: StoryboardFrameWait = {
  selector: KIBANA_DASHBOARD_FRAME,
  loading: [
    '.euiLoadingSpinner',
    '.embPanel__loading',
    '[data-test-subj*="loading"]',
    '[data-test-subj="dashboardPanelLoadingIndicator"]',
    '.embPanel__loadingIndicator',
    '.echChart__loading',
  ],
  ready: ['div.kbnGridPanel'],
  timeout: 60000,
  settleMs: 5000,
  waitForNetworkIdle: true,
};

/** GTIN used by the product/batch/leaflet fixtures. */
const PRODUCT_CODE = '12345678901234';
const BATCH_NUMBER = 'BATCH-001';
const LEAFLET_ID = 1;

const NOW = '2026-01-15T10:00:00.000Z';
const UPDATED = '2026-02-20T14:30:00.000Z';

const PRODUCT = {
  productCode: PRODUCT_CODE,
  inventedName: 'Ibuprofen 400mg',
  nameMedicinalProduct: 'Ibuprofen',
  internalMaterialCode: 'MAT-001',
  productRecall: false,
  owner: 'Angular Template',
  batches: 3,
  strengths: [
    { productCode: PRODUCT_CODE, substance: 'Ibuprofen', strength: '400mg' },
    { productCode: PRODUCT_CODE, substance: 'Ibuprofen', strength: '600mg' },
  ],
  markets: [
    {
      productCode: PRODUCT_CODE,
      marketId: 'eu',
      nationalCode: 'PT',
      mahName: 'Example Organization',
      legalEntityName: 'Example Organization',
      mahAddress: 'Rua da Prata 1, Lisbon, Portugal',
    },
    {
      productCode: PRODUCT_CODE,
      marketId: 'us',
      nationalCode: 'US',
      mahName: 'Example Organization',
      legalEntityName: 'Example Organization',
      mahAddress: '100 Independence Ave, Washington, DC, United States',
    },
  ],
  createdAt: NOW,
  updatedAt: UPDATED,
  version: 2,
  createdBy: 'angular-template-admin',
  updatedBy: 'angular-template-admin',
};

const BATCH = {
  productCode: PRODUCT_CODE,
  batchNumber: BATCH_NUMBER,
  batchName: 'Batch 001',
  nameMedicinalProduct: 'Ibuprofen',
  inventedName: 'Ibuprofen 400mg',
  importLicenseNumber: 'IMPORT-2026-001',
  packagingSiteName: 'Packaging Site A',
  expiryDate: '2027-01-01',
  enableDaySelection: false,
  manufacturerName: 'Manufacturer A',
  dateOfManufacturing: '2026-01-10',
  manufacturerAddress: [{ address: 'Industrial Park 1, Lisbon, Portugal' }],
  batchRecall: false,
  dataMatrix: `01${PRODUCT_CODE}17${'20270101'}10${BATCH_NUMBER}`,
  createdAt: NOW,
  updatedAt: UPDATED,
  version: 1,
  createdBy: 'angular-template-admin',
  updatedBy: 'angular-template-admin',
};

/** External documents referenced by the leaflet fixture. */
const EXTERNAL_FILES = [
  {
    fileName: 'ibuprofen-leaflet.mp4',
    contentType: 'video/mp4',
    size: 4194304,
    storageKey: `public/leaflet/external/${PRODUCT_CODE}/${BATCH_NUMBER}/ibuprofen-leaflet.mp4`,
    uploadedAt: UPDATED,
  },
  {
    fileName: 'ibuprofen-package.png',
    contentType: 'image/png',
    size: 262144,
    storageKey: `public/leaflet/external/${PRODUCT_CODE}/${BATCH_NUMBER}/ibuprofen-package.png`,
    uploadedAt: UPDATED,
  },
];

const LEAFLET = {
  id: LEAFLET_ID,
  productCode: PRODUCT_CODE,
  batchNumber: BATCH_NUMBER,
  leafletType: 'patient',
  lang: 'en',
  epiMarket: 'EU',
  externalFiles: JSON.stringify(EXTERNAL_FILES),
  createdAt: NOW,
  updatedAt: UPDATED,
  version: 1,
  createdBy: 'angular-template-admin',
  updatedBy: 'angular-template-admin',
};

const LEAFLET_FILE = {
  id: 1,
  leafletId: LEAFLET_ID,
  filename: 'ibuprofen-400mg-en.xml',
  createdAt: NOW,
  updatedAt: UPDATED,
};

const LEAFLET_FILES = [
  LEAFLET_FILE,
  {
    id: 2,
    leafletId: LEAFLET_ID,
    filename: 'ibuprofen-400mg-en.pdf',
    createdAt: NOW,
    updatedAt: UPDATED,
  },
];

const AUDIT_ENTRIES = [
  {
    id: 1,
    user: 'angular-template-admin',
    group: 'pharmaledgerassoc',
    transaction: 'create',
    action: 'product',
    model: 'product',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 2,
    user: 'angular-template-admin',
    group: 'pharmaledgerassoc',
    transaction: 'update',
    action: 'batch',
    model: 'batch',
    createdAt: NOW,
    updatedAt: UPDATED,
  },
  {
    id: 3,
    user: 'angular-template-admin',
    group: 'pharmaledgerassoc',
    transaction: 'create',
    action: 'leaflet',
    model: 'leaflet',
    createdAt: NOW,
    updatedAt: UPDATED,
  },
  {
    id: 4,
    user: 'angular-template-admin',
    group: 'pharmaledgerassoc',
    transaction: 'update',
    action: 'product',
    model: 'product',
    createdAt: NOW,
    updatedAt: UPDATED,
  },
];

const TASK = {
  id: 'task-001',
  userId: 'angular-template-admin',
  atomicity: 'atomic',
  classification: 'product',
  name: 'Create product 12345678901234',
  status: 'PENDING',
  attempt: 0,
  maxAttempts: 3,
  createdAt: NOW,
  updatedAt: UPDATED,
};

const TOKEN = {
  id: 1,
  mspid: 'pharmaledgerassoc',
  classification: 'MAH',
  expiredAt: '2026-12-31T23:59:59.000Z',
  claimed: false,
  createdAt: NOW,
  updatedAt: UPDATED,
};

const ACCOUNT = {
  id: 1,
  legalName: 'Example Organization',
  deployed: true,
  token: 'enroll-token-001',
  mspId: 'pharmaledgerassoc',
  endpoint: 'https://api.example.com',
  createdAt: NOW,
  updatedAt: UPDATED,
};

/**
 * Runtime environment injected before the Angular bundle boots. `env.js` returns
 * early when `window.ENV` already exists, so this fully replaces the file-based
 * configuration without touching `src/assets/env.js`. The organisation selects the
 * PLA namespace, and the Keycloak client is the one the JWT roles are scoped to.
 */
const APP_ENV = {
  app: 'Enterprise Wallet',
  env: 'development',
  organization: 'pharmaledgerassoc',
  ptp: { host: MOCK_HOST, protocol: 'http' },
  keycloak: {
    host: MOCK_HOST,
    protocol: 'http',
    clientId: 'pdm-oauth',
    realm: 'pharmaledgerassoc',
    refreshThreshold: 60,
  },
  kibana: { enabled: true, realm: 'pdm', dashboard: 'storyboard', delay: -1 },
  blobs: { maxSize: 26214400 },
};

/**
 * Builds a structurally valid, unsigned JWT carrying every PLA/EPI role the app
 * understands. The application only decodes the payload to derive the account and
 * the menu, so no signature is required for the UI to run.
 */
const buildJwt = (): string => {
  const encode = (value: object): string =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({
      exp: Math.floor(Date.now() / 1000) + 3600,
      resource_access: {
        'pdm-oauth': {
          roles: [
            'pla-admin',
            'pla-reader',
            'pla-writer',
            'epi-admin',
            'epi-reader',
            'epi-writer',
          ],
        },
      },
    }),
    'storyboard',
  ].join('.');
};

const fulfillJson = (route: Route, body: unknown): Promise<void> =>
  route.fulfill({
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const fulfillText = (
  route: Route,
  contentType: string,
  body: string
): Promise<void> =>
  route.fulfill({ status: 200, headers: { 'Content-Type': contentType }, body });

/**
 * Deterministic stand-in for the Keycloak sign-in page reached after the wallet
 * starts the single sign-on flow. It reproduces the fields the real provider asks
 * for so the manual can show the actual login screen without depending on a live
 * identity provider.
 */
const KEYCLOAK_LOGIN_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Sign in to your account</title><style>
html,body{height:100%;margin:0;font-family:system-ui,sans-serif;background:#f0f0f0;color:#151515}
main{min-height:100%;display:flex;align-items:center;justify-content:center}
.card{width:420px;background:#fff;padding:40px 32px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.12)}
.brand{display:flex;align-items:center;gap:10px;margin-bottom:24px}
.brand .mark{width:28px;height:28px;border-radius:6px;background:#e11d48}
h1{margin:0;font-size:22px;font-weight:600}
label{display:block;font-size:12px;font-weight:600;color:#4d4d4d;margin:16px 0 4px}
input{width:100%;box-sizing:border-box;padding:8px 10px;font-size:14px;border:1px solid #b8bbbe;border-radius:4px}
.actions{margin-top:24px;display:flex;align-items:center;justify-content:space-between}
button{padding:8px 18px;font-size:14px;border:none;border-radius:4px;background:#0066cc;color:#fff}
a{font-size:12px;color:#0066cc;text-decoration:none}
</style></head><body>
<main><div class="card">
<div class="brand"><span class="mark"></span><strong>Angular Template</strong></div>
<h1>Sign in to your account</h1>
<form id="kc-form-login" action="#" method="post">
<label for="username">Username or email</label>
<input id="username" name="username" type="text" autocomplete="username" autofocus>
<label for="password">Password</label>
<input id="password" name="password" type="password" autocomplete="current-password">
<div class="actions"><button id="kc-login" type="submit">Sign In</button><a href="#">Forgot password?</a></div>
</form>
</div></main>
</body></html>`;

interface MockOptions {
  /** Return no products, so the list and batch pages show their empty state. */
  emptyProducts?: boolean;
}

/**
 * Installs the storyboard mock backend on a page.
 *
 * - `window.ENV` is injected for every document so the runtime configuration is
 *   deterministic across navigations.
 * - A single catch-all route handler answers the Keycloak login, the event stream,
 *   the Kibana dashboard and every repository endpoint used by the pages. Specific
 *   endpoints are matched before the generic empty-page fallback, so the lists,
 *   read forms and secondary queries (documents, strengths, markets, batches and
 *   audit entries) all return representative data.
 */
const installMockBackend = async (
  page: Page,
  options: MockOptions = {}
): Promise<void> => {
  const token = buildJwt();
  const products = options.emptyProducts ? [] : [PRODUCT];

  await page.addInitScript((env) => {
    Object.defineProperty(window, 'ENV', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: env,
    });
  }, APP_ENV);

  await page.unroute('**/*').catch(() => undefined);
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.startsWith(baseUrl)) return route.continue();

    if (url.includes('/auth/login')) {
      if (request.isNavigationRequest()) {
        return fulfillText(route, 'text/html', KEYCLOAK_LOGIN_HTML);
      }
      return fulfillJson(route, { token });
    }
    if (url.includes('/events')) return fulfillText(route, 'text/event-stream', '');
    if (url.includes('/kibana')) {
      return fulfillText(
        route,
        'text/html',
        `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;font-family:system-ui,sans-serif;background:#f5f7fa;color:#1f2933}
header{display:flex;align-items:center;gap:10px;height:38px;padding:0 16px;background:#fff;border-bottom:1px solid #d9e0e8}
.logo{width:18px;height:18px;border-radius:4px;background:#e11d48}
header strong{font-size:13px}
nav{display:flex;gap:14px;margin-left:18px;font-size:11px;color:#52606d}
main{padding:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.kbnGridPanel{background:#fff;border:1px solid #e4e7eb;border-radius:8px;padding:10px;min-height:58px}
.kbnGridPanel h3{margin:0 0 4px;font-size:11px;color:#52606d;font-weight:600}
.kbnGridPanel .value{font-size:20px;font-weight:700;color:#1f2933}
.bar{height:6px;border-radius:3px;background:#e11d48;margin-top:8px}
.embPanel__loadingIndicator{font-size:11px;color:#52606d;padding:6px 0}
</style></head><body>
<header><span class="logo"></span><strong>Kibana</strong><nav><span>Discover</span><span>Visualize</span><span>Dashboard</span></nav></header>
<main>
<div class="embPanel__loadingIndicator" id="dashboard-loading">Loading dashboard&hellip;</div>
<div class="kbnGridPanel"><h3>Total products</h3><div class="value">1,284</div><div class="bar" style="width:72%"></div></div>
<div class="kbnGridPanel"><h3>Batches</h3><div class="value">8,431</div><div class="bar" style="width:54%"></div></div>
<div class="kbnGridPanel"><h3>Leaflets</h3><div class="value">642</div><div class="bar" style="width:38%"></div></div>
</main>
<script>setTimeout(function(){var el=document.getElementById('dashboard-loading');if(el){el.parentNode.removeChild(el);}},600);</script>
</body></html>`
      );
    }

    if (url.includes('/product/statement/paginateBy') || url.includes('/product/listBy')) {
      return fulfillJson(route, { data: products, total: products.length });
    }
    if (url.includes('/product-strength/findBy')) {
      return fulfillJson(route, PRODUCT.strengths);
    }
    if (url.includes('/market/findBy')) return fulfillJson(route, PRODUCT.markets);
    if (url.includes('/leaflet-file/findBy')) return fulfillJson(route, LEAFLET_FILES);
    if (url.includes('/leaflet/findBy')) return fulfillJson(route, [LEAFLET]);
    if (url.includes('/batch/findBy')) return fulfillJson(route, [BATCH]);
    if (url.includes('/audit/statement/paginateBy')) {
      return fulfillJson(route, { data: AUDIT_ENTRIES, total: AUDIT_ENTRIES.length });
    }
    if (url.includes('/tasks/statement/paginateBy')) {
      return fulfillJson(route, { data: [TASK], total: 1 });
    }
    if (url.includes('/token/statement/paginateBy')) {
      return fulfillJson(route, { data: [TOKEN], total: 1 });
    }
    if (url.includes('/accounts/statement/paginateBy')) {
      return fulfillJson(route, { data: [ACCOUNT], total: 1 });
    }
    if (/\/product\/[^/]+$/.test(url)) return fulfillJson(route, PRODUCT);
    if (/\/batch\/[^/]+$/.test(url)) return fulfillJson(route, BATCH);
    if (/\/leaflet\/[^/]+$/.test(url)) return fulfillJson(route, LEAFLET);
    if (/\/accounts\/[^/]+$/.test(url)) return fulfillJson(route, ACCOUNT);

    return fulfillJson(route, { data: [], total: 0 });
  });
};

const teardownMockBackend = async (page: Page): Promise<void> => {
  await page.unroute('**/*').catch(() => undefined);
};

const SECTION_GETTING_STARTED = 'Getting started';
const SECTION_PRODUCTS = 'Products';
const SECTION_BATCHES = 'Batches';
const SECTION_LEAFLETS = 'ePI documents';
const SECTION_AUDIT = 'Audit logs';
const SECTION_TASKS = 'Tasks';
const SECTION_ADMIN = 'Administration';
const SECTION_ACCOUNTS = 'Accounts';
const SECTION_TOKEN = 'Enrollment token';
const SECTION_ERRORS = 'Errors and empty states';

const sections: StoryboardSection[] = [
  {
    title: SECTION_GETTING_STARTED,
    intro: `The Enterprise Wallet (EW) is the web application used by marketing authorisation holders and
national competent authorities to publish, maintain and audit medicinal product data (products, batches and
electronic product information documents) on the product network.

The application is delivered as a single responsive Ionic application. All authenticated pages share the same
shell: a top header with the application title, operation shortcuts and the account avatar, and a collapsible side
menu that links every section the signed-in account is allowed to reach. Access is role-based: the \`PLA\` roles
(\`pla-admin\`, \`pla-reader\`, \`pla-writer\`) govern products, batches, leaflets, tasks and enrollments,
while the \`EPI\` roles (\`epi-admin\`, \`epi-reader\`, \`epi-writer\`) govern the product/batch and leaflet screens.`,
  },
  {
    title: SECTION_PRODUCTS,
    intro: `The Products section is the entry point of the wallet. A product is identified by its GTIN
(\`productCode\`), described by an invented name and the medicinal product name, and carries an optional
internal material code, a product image, a recall flag, strengths and markets. Products are the parent entity of batches
and ePI documents.

The product screens are reachable from the **Products & Batches** entry in the side menu. The list supports searching,
sorting and paging; the read screen is read-only; the create and update screens use the shared
model renderer with a *SHOW FORM* action that expands the repeatable strengths and markets sections.`,
  },
  {
    title: SECTION_BATCHES,
    intro: `The Batches section manages the production batches of a product. A batch is identified by the product GTIN
plus a batch number, and carries import licence, packaging site, expiry, manufacturing and recall information. A batch
inherits the product's ePI documents, so the batch read screen also lists the leaflets attached to its product.`,
  },
  {
    title: SECTION_LEAFLETS,
    intro: `ePI documents (electronic product information, "leaflets") are the patient and prescribing documents
attached to a product/batch pair for a language and market. The list shows the document type, language, market and owner;
the create screen uploads a local XML document or registers an external document by URL, and the read screen lists the
attached documents and external files.`,
  },
  {
    title: SECTION_AUDIT,
    intro: `The Audit section is a read-only, append-only ledger of every create, update and delete performed on the
wallet. It supports searching, sorting and paging, and can be exported to CSV.`,
  },
  {
    title: SECTION_TASKS,
    intro: `The Tasks section tracks the asynchronous jobs the wallet runs (for example product metadata
propagation to the backend cache). Tasks are only shown to PLA accounts.`,
  },
  {
    title: SECTION_ADMIN,
    intro: `The Administration section is only reachable by PLA administrators. It manages the organisation
**enrollments**: the one-time tokens that onboard a new organisation onto the network.`,
  },
  {
    title: SECTION_ACCOUNTS,
    intro: `The accounts registry holds the organisations already known to the network. Each account record
carries the organisation legal name, its deployment status, the MSP identifier, the backend endpoint, the modules and
features enabled for the account, and the Keycloak client roles assigned to it. Accounts are read-only from the wallet:
they are created and updated by the network administrator in Keycloak.`,
  },
  {
    title: SECTION_TOKEN,
    intro: `The enrollment token screen validates the token printed on the onboarding letter so the new
organisation can be enrolled into the network.`,
  },
  {
    title: SECTION_ERRORS,
    intro: `The application surfaces a generic error page for blocked operations and unexpected failures,
and an empty state when a list has no data or when a prerequisite (a product) does not exist yet.`,
  },
];

/**
 * Builds a scenario with the shared mock backend setup/teardown. The numbered
 * legends in the descriptions match the order of the `highlights` array.
 */
const scenario = (
  values: Omit<StoryboardScenario, 'setup' | 'teardown'> & {
    setup?: StoryboardScenario['setup'];
    teardown?: StoryboardScenario['teardown'];
  }
): StoryboardScenario => ({
  ...values,
  setup: values.setup ?? ((page: Page) => installMockBackend(page)),
  teardown: values.teardown ?? teardownMockBackend,
});

const scenarios: StoryboardScenario[] = [
  // ------------------------------------------------------------------ login
  scenario({
    id: 'ew-login-sso',
    section: SECTION_GETTING_STARTED,
    title: 'Keycloak sign-in',
    description: `Opening the wallet starts the Keycloak single sign-on flow, which lands on the identity provider's
sign-in screen. The user signs in with their network credentials; the wallet never receives or stores the password.`,
    notes: [
      '**1** Identity provider.',
      '**2** Username or email.',
      '**3** Password.',
      '**4** **Sign In** submits the credentials and returns the user to the wallet.',
      'Credentials are handled entirely by Keycloak; the wallet only receives the signed token.',
    ],
    route: `http://${MOCK_HOST}/auth/login`,
    waitUntil: 'domcontentloaded',
    highlights: [
      { selector: '.brand' },
      { selector: '#username' },
      { selector: '#password' },
      { selector: '#kc-login' },
    ],
  }),
  scenario({
    id: 'ew-login',
    section: SECTION_GETTING_STARTED,
    title: 'Sign in to the wallet',
    description: `The sign-in screen is the application landing page. While the wallet checks whether a valid session
already exists it shows the application logo; if no session is found the single sign-on flow starts automatically. The
**Login** button is the manual fallback for the rare case where the automatic redirect is blocked.`,
    notes: [
      '**1** Application logo.',
      '**2** Authentication status prompt.',
      '**3** **Login** button, the manual fallback that starts the Keycloak single sign-on flow.',
      'The application never asks for a username or password directly: credentials are handled by the Keycloak identity provider.',
      'A signed-in session lasts one hour; the wallet refreshes it transparently in the background.',
    ],
    route: '/login',
    hideSelectors: ['.loader'],
    highlights: [
      { selector: '.logo' },
      { selector: '.title' },
      { selector: 'ion-button' },
    ],
  }),
  scenario({
    id: 'ew-logout',
    section: SECTION_GETTING_STARTED,
    title: 'Signed out',
    description: `After signing out, the wallet returns to the sign-in screen with a confirmation message and the
**Login** button, so the user can start a new session.`,
    notes: [
      '**1** Signed-out confirmation.',
      '**2** **Login** button.',
    ],
    route: '/logout',
    highlights: [{ selector: '.title' }, { selector: 'ion-button' }],
  }),
  scenario({
    id: 'ew-dashboard',
    section: SECTION_GETTING_STARTED,
    title: 'Dashboard',
    description: `The dashboard is the home screen of the wallet. It embeds the Kibana control panel used to inspect
the network, and shares the application shell (header, menu and account avatar) with every other authenticated page.`,
    notes: [
      '**1** Application header, with the operation shortcuts and the account avatar.',
      '**2** Kibana control panel.',
      'The embedded dashboard is read-only; all wallet operations are performed from the side menu.',
    ],
    route: '/dashboard',
    waitForFrame: KIBANA_DASHBOARD_WAIT,
    highlights: [
      { selector: 'app-header' },
      { selector: '.kibana-container' },
    ],
  }),
  /*
   * The AstraTrace screen is intentionally left out of the user guide: it is a
   * secondary, read-only analytics view that is not part of the end-user flows
   * documented here. The scenario is kept commented out (not deleted) so it can be
   * restored without rewriting it. It embeds the same Kibana dashboard, so when it
   * is restored it must reuse the shared `KIBANA_DASHBOARD_WAIT` wait rather
   * than capture before the embedded dashboard has rendered.
   *
   * scenario({
   *   id: 'ew-astratrace',
   *   section: SECTION_GETTING_STARTED,
   *   title: 'AstraTrace analytics',
   *   description: `AstraTrace embeds a second Kibana dashboard focused on traceability analytics. Like the
   * dashboard, it is a read-only view of the network data.`,
   *   notes: ['**1** AstraTrace Kibana dashboard.'],
   *   route: '/astratrace',
   *   waitForFrame: KIBANA_DASHBOARD_WAIT,
   *   highlights: [{ selector: '.kibana-container' }],
   * }),
   */
  scenario({
    id: 'ew-account',
    section: SECTION_GETTING_STARTED,
    title: 'Account',
    description: `The account screen shows the profile decoded from the current Keycloak token: the subject,
the organisation, the namespace and the roles the account holds. It is reachable from the avatar in the top-right corner.`,
    notes: [
      '**1** Decoded account and roles.',
      'The account screen is read-only; roles are assigned by the network administrator in Keycloak.',
    ],
    route: '/account',
    highlights: [{ selector: '.dcf-props-container' }],
  }),

  // --------------------------------------------------------------- products
  scenario({
    id: 'ew-products-list',
    section: SECTION_PRODUCTS,
    title: 'Product list',
    description: `The product list is the entry point of the Products section. Each row shows the product GTIN,
invented name and medicinal product name. The list is searched with the search bar, sorted and paged, and new products
are created from the header action.`,
    notes: [
      '**1** Page title, tabs and actions.',
      '**2** Search bar.',
      '**3** Product list.',
      '**4** Product row.',
      'Selecting a row opens the read-only product details.',
      'The list only shows the products the signed-in account is allowed to see.',
    ],
    route: '/products',
    highlights: [
      { selector: 'app-card-title' },
      { selector: 'ngx-decaf-searchbar' },
      { selector: 'ngx-decaf-list' },
      { selector: 'app-product-item' },
    ],
  }),
  scenario({
    id: 'ew-products-create-identity',
    section: SECTION_PRODUCTS,
    title: 'Create a product — identity',
    description: `The create-product form collects the product identity and description. The GTIN
(\`productCode\`) is validated, the invented name and medicinal product name are required, and the internal material code
is optional.`,
    notes: [
      '**1** GTIN (\`productCode\`).',
      '**2** Invented name.',
      '**3** Medicinal product name.',
      '**4** Internal material code.',
      'The form continues with the product image and recall flag, then the strengths and markets sections.',
    ],
    route: '/products/create',
    highlights: [
      { selector: '[id="productCode"]' },
      { selector: '[id="inventedName"]' },
      { selector: '[id="nameMedicinalProduct"]' },
      { selector: '[id="internalMaterialCode"]' },
    ],
  }),
  scenario({
    id: 'ew-products-create-image',
    section: SECTION_PRODUCTS,
    title: 'Create a product — image and recall',
    description: `The product image is uploaded from the local file system and the **product recall** switch marks the
product as recalled. The image is optional but, when set, is propagated to the backend cache.`,
    notes: [
      '**1** Product image upload.',
      '**2** Product recall switch.',
    ],
    route: '/products/create',
    highlights: [
      { selector: 'ngx-decaf-file-upload' },
      { selector: '[id="productRecall"]' },
    ],
    scrollTo: 'ngx-decaf-file-upload',
  }),
  scenario({
    id: 'ew-products-create-strengths',
    section: SECTION_PRODUCTS,
    title: 'Create a product — strengths',
    description: `The **strengths** section lists the active substance strengths of the product. It is repeatable:
select **SHOW FORM** to add a strength, fill in the substance and the strength, and remove entries individually.`,
    notes: [
      '**1** Strength section, with the **SHOW FORM** switch and the strength form.',
      '**2** Active substance.',
      '**3** Strength value.',
      'A product can carry more than one strength; each one is listed separately.',
    ],
    route: '/products/create',
    actions: [
      { type: 'click', selector: '#productstrength-switcher .dcf-button-add' },
      { type: 'wait', ms: 400 },
    ],
    highlights: [
      { selector: '[id="productstrength-fieldset"]' },
      { selector: '[id="substance"]' },
      { selector: '[id="strength"]' },
    ],
    scrollTo: '[id="productstrength-fieldset"]',
  }),
  scenario({
    id: 'ew-products-create-markets',
    section: SECTION_PRODUCTS,
    title: 'Create a product — markets',
    description: `The **markets** section lists the markets in which the product is placed. It is repeatable in the
same way as the strengths section, and records the national code, the marketing authorisation holder and its address.`,
    notes: [
      '**1** Market section, with the **SHOW FORM** switch and the market form.',
      '**2** Market.',
      '**3** National code.',
      '**4** Marketing authorisation holder name.',
      '**5** Legal entity name.',
      '**6** Marketing authorisation holder address.',
    ],
    route: '/products/create',
    actions: [
      { type: 'click', selector: '#productmarket-switcher .dcf-button-add' },
      { type: 'wait', ms: 400 },
    ],
    highlights: [
      { selector: '[id="productmarket-fieldset"]' },
      { selector: '[id="marketId"]' },
      { selector: '[id="nationalCode"]' },
      { selector: '[id="mahName"]' },
      { selector: '[id="legalEntityName"]' },
      { selector: '[id="mahAddress"]' },
    ],
    scrollTo: '[id="productmarket-fieldset"]',
  }),
  scenario({
    id: 'ew-products-create-actions',
    section: SECTION_PRODUCTS,
    title: 'Create a product — actions',
    description: `The **CREATE** action submits the form; **BACK** returns to the list without saving.`,
    notes: [
      '**1** **CREATE** submits the product.',
      '**2** **BACK** returns to the list without saving.',
    ],
    route: '/products/create',
    highlights: [
      { selector: 'ion-button:has-text("CREATE")' },
      { selector: 'ion-button:has-text("BACK")' },
    ],
    scrollTo: 'ion-button:has-text("CREATE")',
  }),
  scenario({
    id: 'ew-products-read-identity',
    section: SECTION_PRODUCTS,
    title: 'Product details',
    description: `The read-only product details show the product identity and description: the GTIN, the invented
name, the medicinal product name, the internal material code, the image and the recall status. The header shortcuts open the
update form or return to the list.`,
    notes: [
      '**1** GTIN.',
      '**2** Invented name.',
      '**3** Medicinal product name.',
      '**4** Internal material code.',
      'The image and recall status, and the attached ePI documents, strengths and markets, are shown further down the page.',
      'The GTIN is the identifier used to link batches and ePI documents to the product.',
    ],
    route: `/products/read/${PRODUCT_CODE}`,
    highlights: [
      { selector: '[id="productCode"]' },
      { selector: '[id="inventedName"]' },
      { selector: '[id="nameMedicinalProduct"]' },
      { selector: '[id="internalMaterialCode"]' },
    ],
  }),
  scenario({
    id: 'ew-products-read-documents',
    section: SECTION_PRODUCTS,
    title: 'Product details — ePI documents',
    description: `The **ePI documents** list shows the patient and prescribing documents attached to the product,
with their batch, language, market and owner. Selecting a document opens its read-only details.`,
    notes: [
      '**1** ePI documents attached to the product.',
      'The list is empty until at least one ePI document is created for the product.',
    ],
    route: `/products/read/${PRODUCT_CODE}`,
    highlights: [{ selector: '[id="leaflet-switcher"]' }],
    scrollTo: '[id="leaflet-switcher"]',
  }),
  scenario({
    id: 'ew-products-read-strengths',
    section: SECTION_PRODUCTS,
    title: 'Product details — strengths',
    description: `The **strengths** section lists the active substance strengths of the product.`,
    notes: ['**1** Strengths attached to the product.'],
    route: `/products/read/${PRODUCT_CODE}`,
    highlights: [{ selector: '[id="productstrength-switcher"]' }],
    scrollTo: '[id="productstrength-switcher"]',
  }),
  scenario({
    id: 'ew-products-read-markets',
    section: SECTION_PRODUCTS,
    title: 'Product details — markets',
    description: `The **markets** section lists the markets in which the product is placed, with the national code
and the marketing authorisation holder.`,
    notes: ['**1** Markets attached to the product.'],
    route: `/products/read/${PRODUCT_CODE}`,
    highlights: [{ selector: '[id="productmarket-switcher"]' }],
    scrollTo: '[id="productmarket-switcher"]',
  }),
  scenario({
    id: 'ew-products-read-actions',
    section: SECTION_PRODUCTS,
    title: 'Product details — actions',
    description: `**BACK** returns to the product list.`,
    notes: ['**1** **BACK** returns to the product list.'],
    route: `/products/read/${PRODUCT_CODE}`,
    highlights: [{ selector: 'ion-button:has-text("BACK")' }],
    scrollTo: 'ion-button:has-text("BACK")',
  }),
  scenario({
    id: 'ew-products-update-fields',
    section: SECTION_PRODUCTS,
    title: 'Update a product — fields',
    description: `The update form is the create form pre-filled with the current product. The GTIN is read-only,
the remaining fields become editable, and the product image can be replaced.`,
    notes: [
      '**1** Editable invented name.',
      '**2** Editable medicinal product name.',
      '**3** Editable internal material code.',
      'The GTIN is read-only; the attached ePI documents, strengths and markets are listed further down the form.',
    ],
    route: `/products/update/${PRODUCT_CODE}`,
    highlights: [
      { selector: '[id="inventedName"]' },
      { selector: '[id="nameMedicinalProduct"]' },
      { selector: '[id="internalMaterialCode"]' },
    ],
  }),
  scenario({
    id: 'ew-products-update-image',
    section: SECTION_PRODUCTS,
    title: 'Update a product — image and recall',
    description: `The product image can be replaced from the local file system and the **product recall** switch marks
the product as recalled.`,
    notes: [
      '**1** Product image upload.',
      '**2** Product recall switch.',
    ],
    route: `/products/update/${PRODUCT_CODE}`,
    highlights: [
      { selector: 'ngx-decaf-file-upload' },
      { selector: '[id="productRecall"]' },
    ],
    scrollTo: 'ngx-decaf-file-upload',
  }),
  scenario({
    id: 'ew-products-update-strengths',
    section: SECTION_PRODUCTS,
    title: 'Update a product — strengths',
    description: `The **strengths** section lists the strengths already attached to the product. A new strength is
added with **SHOW FORM** and existing entries are removed individually.`,
    notes: [
      '**1** Strength section, with the **SHOW FORM** switch and the strength form.',
      '**2** Active substance.',
      '**3** Strength value.',
    ],
    route: `/products/update/${PRODUCT_CODE}`,
    actions: [
      { type: 'click', selector: '#productstrength-switcher .dcf-button-add' },
      { type: 'wait', ms: 400 },
    ],
    highlights: [
      { selector: '[id="productstrength-fieldset"]' },
      { selector: '[id="substance"]' },
      { selector: '[id="strength"]' },
    ],
    scrollTo: '[id="productstrength-fieldset"]',
  }),
  scenario({
    id: 'ew-products-update-markets',
    section: SECTION_PRODUCTS,
    title: 'Update a product — markets',
    description: `The **markets** section lists the markets already attached to the product. A new market is added
with **SHOW FORM** and existing entries are removed individually.`,
    notes: [
      '**1** Market section, with the **SHOW FORM** switch and the market form.',
      '**2** Market.',
      '**3** National code.',
      '**4** Marketing authorisation holder name.',
      '**5** Legal entity name.',
      '**6** Marketing authorisation holder address.',
    ],
    route: `/products/update/${PRODUCT_CODE}`,
    actions: [
      { type: 'click', selector: '#productmarket-switcher .dcf-button-add' },
      { type: 'wait', ms: 400 },
    ],
    highlights: [
      { selector: '[id="productmarket-fieldset"]' },
      { selector: '[id="marketId"]' },
      { selector: '[id="nationalCode"]' },
      { selector: '[id="mahName"]' },
      { selector: '[id="legalEntityName"]' },
      { selector: '[id="mahAddress"]' },
    ],
    scrollTo: '[id="productmarket-fieldset"]',
  }),
  scenario({
    id: 'ew-products-update-documents',
    section: SECTION_PRODUCTS,
    title: 'Update a product — ePI documents',
    description: `The **ePI documents** list shows the patient and prescribing documents attached to the product.`,
    notes: ['**1** ePI documents attached to the product.'],
    route: `/products/update/${PRODUCT_CODE}`,
    highlights: [{ selector: '[id="leaflet-switcher"]' }],
    scrollTo: '[id="leaflet-switcher"]',
  }),
  scenario({
    id: 'ew-products-update-actions',
    section: SECTION_PRODUCTS,
    title: 'Update a product — actions',
    description: `**UPDATE** opens the change confirmation modal, which shows exactly what changed before the update
is confirmed and persisted (and written to the audit log). **BACK** returns to the list without saving.`,
    notes: [
      '**1** **UPDATE** opens the change confirmation modal.',
      '**2** **BACK** returns to the list without saving.',
    ],
    route: `/products/update/${PRODUCT_CODE}`,
    highlights: [
      { selector: 'ion-button:has-text("UPDATE")' },
      { selector: 'ion-button:has-text("BACK")' },
    ],
    scrollTo: 'ion-button:has-text("UPDATE")',
  }),
  // ---------------------------------------------------------------- batches
  scenario({
    id: 'ew-batches-list',
    section: SECTION_BATCHES,
    title: 'Batch list',
    description: `The batch list shows one row per product with the number of batches it has. From here a batch is
opened, created or searched.`,
    notes: [
      '**1** Page title, tabs and actions.',
      '**2** Search bar.',
      '**3** Batch table.',
      '**4** Pagination.',
      'The list is empty until at least one product exists; the empty state links directly to the product create form.',
    ],
    route: '/batches',
    highlights: [
      { selector: 'app-card-title' },
      { selector: 'ngx-decaf-searchbar' },
      { selector: 'ngx-decaf-table' },
      { selector: 'ngx-decaf-pagination' },
    ],
  }),
  scenario({
    id: 'ew-batches-create-identity',
    section: SECTION_BATCHES,
    title: 'Add a batch — identity',
    description: `The add-batch form collects the batch identity: the medicinal product name, the invented name and
the batch number. The product names are read-only, because they are inherited from the product selected from the product screen.`,
    notes: [
      '**1** Medicinal product name.',
      '**2** Invented name.',
      '**3** Batch number.',
    ],
    route: '/batches/create',
    highlights: [
      { selector: '[id="nameMedicinalProduct"]' },
      { selector: '[id="inventedName"]' },
      { selector: '[id="batchNumber"]' },
    ],
  }),
  scenario({
    id: 'ew-batches-create-import',
    section: SECTION_BATCHES,
    title: 'Add a batch — import and packaging',
    description: `The import and packaging details identify the licence under which the batch was imported, the
packaging site and the expiry date. **Enable day selection** allows the expiry date to be specified to the day rather than
the month.`,
    notes: [
      '**1** Import licence number.',
      '**2** Packaging site name.',
      '**3** Expiry date.',
      '**4** **Enable day selection** switch.',
    ],
    route: '/batches/create',
    highlights: [
      { selector: '[id="importLicenseNumber"]' },
      { selector: '[id="packagingSiteName"]' },
      { selector: '[id="expiryDate"]' },
      { selector: '[id="enableDaySelection"]' },
    ],
    scrollTo: '[id="importLicenseNumber"]',
  }),
  scenario({
    id: 'ew-batches-create-manufacturer',
    section: SECTION_BATCHES,
    title: 'Add a batch — manufacturing details',
    description: `The manufacturing section collects the manufacturer name, the date of manufacturing and the
manufacturer address. The address is repeatable: expand it with **SHOW FORM** and remove entries individually.`,
    notes: [
      '**1** Manufacturer name.',
      '**2** Date of manufacturing.',
      '**3** Manufacturer address section, with the **SHOW FORM** switch.',
      '**4** Address line.',
    ],
    route: '/batches/create',
    actions: [
      { type: 'click', selector: '#manufactureraddress-fieldset .dcf-button-add' },
      { type: 'wait', ms: 400 },
    ],
    highlights: [
      { selector: '[id="manufacturerName"]' },
      { selector: '[id="dateOfManufacturing"]' },
      { selector: '[id="manufactureraddress-fieldset"]' },
      { selector: '[id="address"]' },
    ],
    scrollTo: '[id="manufactureraddress-fieldset"]',
  }),
  scenario({
    id: 'ew-batches-create-actions',
    section: SECTION_BATCHES,
    title: 'Add a batch — recall and actions',
    description: `**Mark batch as recalled** flags the batch as recalled. **CREATE** submits the batch; **BACK**
returns to the list without saving.`,
    notes: [
      '**1** **Mark batch as recalled** switch.',
      '**2** **CREATE** submits the batch.',
      '**3** **BACK** returns to the list without saving.',
    ],
    route: '/batches/create',
    highlights: [
      { selector: '[id="batchRecall"]' },
      { selector: 'ion-button:has-text("CREATE")' },
      { selector: 'ion-button:has-text("BACK")' },
    ],
    scrollTo: '[id="batchRecall"]',
  }),
  scenario({
    id: 'ew-batches-read-identity',
    section: SECTION_BATCHES,
    title: 'Batch details',
    description: `The read-only batch details show the product GTIN, the batch number, the medicinal and invented
product names, and the import, packaging and manufacturing information.`,
    notes: [
      '**1** Product GTIN.',
      '**2** Batch number.',
      '**3** Medicinal product name.',
      '**4** Invented name.',
      'The generated data matrix and the recall status are shown further down the form.',
    ],
    route: `/batches/read/${BATCH_NUMBER}`,
    highlights: [
      { selector: '[id="productCode"]' },
      { selector: '[id="batchNumber"]' },
      { selector: '[id="nameMedicinalProduct"]' },
      { selector: '[id="inventedName"]' },
    ],
  }),
  scenario({
    id: 'ew-batches-read-manufacturing',
    section: SECTION_BATCHES,
    title: 'Batch details — manufacturing',
    description: `The manufacturing section of the batch details shows the manufacturer name, the date of
manufacturing and the manufacturer address.`,
    notes: [
      '**1** Manufacturer name.',
      '**2** Date of manufacturing.',
      'The manufacturer address is shown on the update form; the read screen shows the values as text.',
    ],
    route: `/batches/read/${BATCH_NUMBER}`,
    highlights: [
      { selector: '[id="manufacturerName"]' },
      { selector: '[id="dateOfManufacturing"]' },
    ],
    scrollTo: '[id="manufacturerName"]',
  }),
  scenario({
    id: 'ew-batches-read-documents',
    section: SECTION_BATCHES,
    title: 'Batch details — ePI documents',
    description: `The ePI documents attached to the product of the batch are listed below the form.`,
    notes: ['**1** ePI documents attached to the product of the batch.'],
    route: `/batches/read/${BATCH_NUMBER}`,
    highlights: [{ selector: '[id="leaflet-switcher"]' }],
    scrollTo: '[id="leaflet-switcher"]',
  }),
  scenario({
    id: 'ew-batches-read-actions',
    section: SECTION_BATCHES,
    title: 'Batch details — actions',
    description: `**BACK** returns to the batch list.`,
    notes: ['**1** **BACK** returns to the batch list.'],
    route: `/batches/read/${BATCH_NUMBER}`,
    highlights: [{ selector: 'ion-button:has-text("BACK")' }],
    scrollTo: 'ion-button:has-text("BACK")',
  }),
  scenario({
    id: 'ew-batches-update-fields',
    section: SECTION_BATCHES,
    title: 'Update a batch — fields',
    description: `The update form is the add-batch form pre-filled with the current batch. The product and batch
number are read-only and the remaining fields become editable.`,
    notes: [
      '**1** Read-only batch number.',
      '**2** Editable import licence number.',
      '**3** Editable packaging site name.',
      '**4** Editable expiry date.',
    ],
    route: `/batches/update/${BATCH_NUMBER}`,
    highlights: [
      { selector: '[id="batchNumber"]' },
      { selector: '[id="importLicenseNumber"]' },
      { selector: '[id="packagingSiteName"]' },
      { selector: '[id="expiryDate"]' },
    ],
  }),
  scenario({
    id: 'ew-batches-update-manufacturing',
    section: SECTION_BATCHES,
    title: 'Update a batch — manufacturing',
    description: `The manufacturing section collects the manufacturer name, the date of manufacturing and the
manufacturer address.`,
    notes: [
      '**1** Editable manufacturer name.',
      '**2** Editable date of manufacturing.',
      '**3** Manufacturer address section.',
    ],
    route: `/batches/update/${BATCH_NUMBER}`,
    highlights: [
      { selector: '[id="manufacturerName"]' },
      { selector: '[id="dateOfManufacturing"]' },
      { selector: '[id="manufactureraddress-fieldset"]' },
    ],
    scrollTo: '[id="manufacturerName"]',
  }),
  scenario({
    id: 'ew-batches-update-actions',
    section: SECTION_BATCHES,
    title: 'Update a batch — recall and actions',
    description: `**Mark batch as recalled** flags the batch as recalled. **UPDATE** opens the change confirmation
modal, which shows exactly what changed before the update is confirmed and persisted. **BACK** returns to the list without
saving.`,
    notes: [
      '**1** **Mark batch as recalled** switch.',
      '**2** **UPDATE** opens the change confirmation modal.',
      '**3** **BACK** returns to the list without saving.',
    ],
    route: `/batches/update/${BATCH_NUMBER}`,
    highlights: [
      { selector: '[id="batchRecall"]' },
      { selector: 'ion-button:has-text("UPDATE")' },
      { selector: 'ion-button:has-text("BACK")' },
    ],
    scrollTo: '[id="batchRecall"]',
  }),
  // --------------------------------------------------------------- leaflets
  scenario({
    id: 'ew-leaflets-list',
    section: SECTION_LEAFLETS,
    title: 'ePI document list',
    description: `The ePI document list shows one row per uploaded document with its product, batch, document type,
language, market and owner. Documents are searched, filtered, paged and opened from here.`,
    notes: [
      '**1** Page title, tabs and actions.',
      '**2** Search bar.',
      '**3** Document table.',
      '**4** Pagination.',
      'The empty state links directly to the product create form when no product exists yet.',
    ],
    route: '/leaflets',
    highlights: [
      { selector: 'app-card-title' },
      { selector: 'ngx-decaf-searchbar' },
      { selector: 'ngx-decaf-table' },
      { selector: 'ngx-decaf-pagination' },
    ],
  }),
  scenario({
    id: 'ew-leaflets-create-classification',
    section: SECTION_LEAFLETS,
    title: 'Create an ePI document — classification',
    description: `The create-ePI form attaches a patient or prescribing document to a product and batch for a
language and market.`,
    notes: [
      '**1** Document type (patient or prescribing).',
      '**2** Language.',
      '**3** Market.',
    ],
    route: '/leaflets/create',
    highlights: [
      { selector: '[id="leafletType"]' },
      { selector: '[id="lang"]' },
      { selector: '[id="epiMarket"]' },
    ],
  }),
  scenario({
    id: 'ew-leaflets-create-documents',
    section: SECTION_LEAFLETS,
    title: 'Create an ePI document — documents',
    description: `The main document can be uploaded from the local file system as a directory or as individual files.
Additional external documents (video, image or PDF) can be registered alongside it.`,
    notes: [
      '**1** Local document upload (**Select Directory** / **Select files**).',
      '**2** Additional external documents.',
    ],
    route: '/leaflets/create',
    highlights: [
      { selector: 'ngx-decaf-file-upload' },
      { selector: 'app-external-file-upload' },
    ],
    scrollTo: 'ngx-decaf-file-upload',
  }),
  scenario({
    id: 'ew-leaflets-create-actions',
    section: SECTION_LEAFLETS,
    title: 'Create an ePI document — actions',
    description: `**CREATE** submits the document; **BACK** returns to the list without saving.`,
    notes: [
      '**1** **CREATE** submits the document.',
      '**2** **BACK** returns to the list without saving.',
    ],
    route: '/leaflets/create',
    highlights: [
      { selector: 'ion-button:has-text("CREATE")' },
      { selector: 'ion-button:has-text("BACK")' },
    ],
    scrollTo: 'ion-button:has-text("CREATE")',
  }),
  scenario({
    id: 'ew-leaflets-read-details',
    section: SECTION_LEAFLETS,
    title: 'ePI document details',
    description: `The read-only ePI details show the product, batch, document type, language and market the document
is attached to.`,
    notes: [
      '**1** Product.',
      '**2** Batch.',
      '**3** Document type.',
      '**4** Market.',
      'The uploaded document and the attached external files are listed further down the form.',
    ],
    route: `/leaflets/read/${LEAFLET_ID}`,
    highlights: [
      { selector: '[id="productCode"]' },
      { selector: '[id="batchNumber"]' },
      { selector: '[id="leafletType"]' },
      { selector: '[id="epiMarket"]' },
    ],
  }),
  scenario({
    id: 'ew-leaflets-read-documents',
    section: SECTION_LEAFLETS,
    title: 'ePI document details — documents',
    description: `The uploaded XML document and the additional external documents are listed below the details. Selecting
an external document opens a preview.`,
    notes: [
      '**1** Uploaded XML document.',
      '**2** External documents (video, image or PDF).',
    ],
    route: `/leaflets/read/${LEAFLET_ID}`,
    highlights: [
      { selector: 'ngx-decaf-file-upload' },
      { selector: '.dcf-external-file-read' },
    ],
    scrollTo: 'ngx-decaf-file-upload',
  }),
  scenario({
    id: 'ew-leaflets-read-actions',
    section: SECTION_LEAFLETS,
    title: 'ePI document details — actions',
    description: `**BACK** returns to the ePI document list.`,
    notes: ['**1** **BACK** returns to the ePI document list.'],
    route: `/leaflets/read/${LEAFLET_ID}`,
    highlights: [{ selector: 'ion-button:has-text("BACK")' }],
    scrollTo: 'ion-button:has-text("BACK")',
  }),

  // ------------------------------------------------------------------ audit
  scenario({
    id: 'ew-audit-list',
    section: SECTION_AUDIT,
    title: 'Audit logs',
    description: `The audit table lists every create, update and delete performed on the wallet, with the user,
group, transaction, action and model. The list is searched, sorted, paged and exported to CSV.`,
    notes: [
      '**1** Page title and CSV export.',
      '**2** Search bar.',
      '**3** Audit table.',
      '**4** Pagination.',
      'The export button downloads the currently filtered rows as a CSV file.',
    ],
    route: '/audit',
    highlights: [
      { selector: 'app-card-title' },
      { selector: 'ngx-decaf-searchbar' },
      { selector: 'ngx-decaf-table' },
      { selector: 'ngx-decaf-pagination' },
    ],
  }),

  // ------------------------------------------------------------------ tasks
  scenario({
    id: 'ew-tasks-list',
    section: SECTION_TASKS,
    title: 'Tasks',
    description: `The task table lists the asynchronous jobs the wallet runs and their status (pending, running,
completed, failed), with the number of attempts. Tasks are only shown to PLA accounts.`,
    notes: [
      '**1** Page title.',
      '**2** Task table.',
    ],
    route: '/tasks',
    highlights: [
      { selector: 'app-card-title' },
      { selector: 'ngx-decaf-table' },
    ],
  }),

  // ------------------------------------------------------------ administration
  scenario({
    id: 'ew-enrollments-list',
    section: SECTION_ADMIN,
    title: 'Enrollments',
    description: `The enrollments table lists the organisations that have been invited to join the network, with their
MSP identifier, classification, expiry and claim status. A new enrollment token is created with the **CREATE** action.`,
    notes: [
      '**1** Page title and actions.',
      '**2** **CREATE** enrollment action.',
      '**3** Search bar.',
      '**4** Enrollment table.',
      '**5** Pagination.',
    ],
    route: '/admin/enrollments',
    highlights: [
      { selector: 'app-card-title' },
      { selector: '#dcf-page-action-button' },
      { selector: 'ngx-decaf-searchbar' },
      { selector: 'ngx-decaf-table' },
      { selector: 'ngx-decaf-pagination' },
    ],
  }),
  scenario({
    id: 'ew-enrollments-create',
    section: SECTION_ADMIN,
    title: 'Create an enrollment',
    description: `The enrollment form issues a one-time token for a new organisation. The MSP identifier identifies the
organisation, the classification selects the account type, and the expiry date bounds the token's validity.`,
    notes: [
      '**1** MSP identifier.',
      '**2** Classification.',
      '**3** Expiry date.',
      '**4** **Claimed**, which records whether the token has already been used.',
      '**5** **Active**, which records whether the enrollment is currently active.',
      '**6** **CREATE** issues the token.',
      '**7** **BACK** returns to the list.',
    ],
    route: '/admin/enrollments/create',
    highlights: [
      { selector: '[id="mspid"]' },
      { selector: '[id="classification"]' },
      { selector: '[id="expiredAt"]' },
      { selector: '[id="claimed"]' },
      { selector: '[id="active"]' },
      { selector: 'ion-button:has-text("CREATE")' },
      { selector: 'ion-button:has-text("BACK")' },
    ],
  }),
  scenario({
    id: 'ew-admin-accounts-list',
    section: SECTION_ACCOUNTS,
    title: 'Accounts',
    description: `The accounts registry lists the organisations already known to the network, with their legal name,
deployment status, MSP identifier and backend endpoint. Accounts are read-only from the wallet: they are created and updated by
the network administrator in Keycloak. When the registry returns no accounts, the page shows its empty state.`,
    notes: [
      '**1** Page title and description.',
      '**2** Search bar.',
      '**3** Empty state, shown while the registry returns no accounts.',
      'Accounts are created and updated by the network administrator in Keycloak, not from the wallet.',
    ],
    route: '/admin/accounts',
    highlights: [
      { selector: 'app-card-title' },
      { selector: 'ngx-decaf-searchbar' },
      { selector: 'ngx-decaf-table' },
    ],
  }),

  // ------------------------------------------------------------ token screen
  scenario({
    id: 'ew-token',
    section: SECTION_TOKEN,
    title: 'Validate an enrollment token',
    description: `The token screen validates the one-time enrollment token printed on the onboarding letter. The token is
pasted into the field and submitted with **VALIDATE**; a valid token redirects to the enrollment form.`,
    notes: [
      '**1** Page title.',
      '**2** Token field.',
      '**3** **VALIDATE** button.',
      'The token can only be validated once.',
      'After validation the organisation completes its own account details in the enrollment form.',
    ],
    route: '/token',
    highlights: [
      { selector: '.dcf-page-title' },
      { selector: '[id="token"]' },
      { selector: 'ion-button' },
    ],
  }),
  scenario({
    id: 'ew-token-enroll-identity',
    section: SECTION_TOKEN,
    title: 'Complete the enrollment — organisation',
    description: `After a valid token is accepted, the organisation completes its own account details in the enrollment
form: the legal name and the network endpoints.`,
    notes: [
      '**1** Legal name of the organisation.',
      '**2** Backend endpoint used by the wallet to reach the organisation backend.',
      'The MSP identifier and the module and feature switches are pre-set by the token.',
    ],
    route: '/token/enroll',
    setup: async (page: Page) => {
      await installMockBackend(page);
      await page.addInitScript((payload) => {
        window.sessionStorage.setItem('enrollData', JSON.stringify(payload));
      }, { data: { orgName: 'Acme Pharma', mspId: 'acmepharma', classification: 'MAH' } });
    },
    waitUntil: 'domcontentloaded',
    scrollTo: '[id="legalName"]',
    highlights: [
      { selector: '[id="legalName"]' },
      { selector: '[id="backendEndpoint"]' },
    ],
  }),
  scenario({
    id: 'ew-token-enroll-roles',
    section: SECTION_TOKEN,
    title: 'Complete the enrollment — roles',
    description: `The organisation then picks the Keycloak client roles it will use and submits the enrollment with
**Create**.`,
    notes: [
      '**1** Keycloak client roles granted to the organisation (ePI administrator, writer and reader).',
      '**2** **Create** submits the enrollment.',
      'The MSP identifier and the module and feature switches are pre-set by the token.',
    ],
    route: '/token/enroll',
    setup: async (page: Page) => {
      await installMockBackend(page);
      await page.addInitScript((payload) => {
        window.sessionStorage.setItem('enrollData', JSON.stringify(payload));
      }, { data: { orgName: 'Acme Pharma', mspId: 'acmepharma', classification: 'MAH' } });
    },
    waitUntil: 'domcontentloaded',
    scrollTo: '#keycloakclientrole-fieldset',
    highlights: [
      { selector: '#keycloakclientrole-fieldset' },
      { selector: 'ion-button:has-text("Create")' },
    ],
  }),

  // ----------------------------------------------------------------- errors
  scenario({
    id: 'ew-error',
    section: SECTION_ERRORS,
    title: 'Error page',
    description: `The error page is shown when an operation is blocked by the account's roles or when a page cannot
be loaded. It explains the failure and offers **BACK** to return to the previous screen.`,
    notes: [
      '**1** Error title.',
      '**2** Error message.',
      '**3** **BACK** returns to the previous screen.',
    ],
    route: '/error',
    highlights: [
      { selector: '.dcf-page-title' },
      { selector: '.dcf-message' },
      { selector: 'ion-button' },
    ],
  }),
  scenario({
    id: 'ew-error-not-found',
    section: SECTION_ERRORS,
    title: 'Not found',
    description: `A blocked or unknown operation (for example deleting a product, which the wallet does not allow)
redirects to the error page with the *not found* message.`,
    notes: [
      '**1** Error title.',
      '**2** Error message.',
      '**3** **BACK** returns to the previous screen.',
    ],
    route: '/error?message=notFound',
    highlights: [
      { selector: '.dcf-page-title' },
      { selector: '.dcf-message' },
      { selector: 'ion-button' },
    ],
  }),
  scenario({
    id: 'ew-batches-empty',
    section: SECTION_ERRORS,
    title: 'Empty list',
    description: `When a list has no data yet, the application shows a consistent empty state: a message
explaining that there are no records to show.`,
    notes: ['**1** Empty state, shown when the list has no data.'],
    route: '/batches',
    setup: (page: Page) => installMockBackend(page, { emptyProducts: true }),
    teardown: teardownMockBackend,
    highlights: [{ selector: 'ngx-decaf-empty-state' }],
  }),
];

export const ewFrontendStoryboard: StoryboardConfig = {
  title: 'Enterprise Wallet (EW) User Manual',
  intro: `This manual documents the Enterprise Wallet (EW) screen by screen: signing in, the dashboard and
analytics, products, batches, ePI documents, audit logs, tasks, administration and the error and empty states.

Every screen is shown at the desktop web layout with its numbered components, and each flow is described step by
step so the reader can follow the wallet from the first sign-in to publishing and auditing medicinal product data.`,
  sections,
  baseUrl,
  guideFile: GUIDE_FILE,
  screenshotsDir: SCREENSHOTS_DIR,
  viewport: { width: 1440, height: 900 },
  layout: 'alternating',
  requireDesktop: true,
  scenarioTimeoutMs: 120000,
  scenarios,
};

export default ewFrontendStoryboard;
