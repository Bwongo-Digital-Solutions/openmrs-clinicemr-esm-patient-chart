# @clinicemr/esm-patient-scd-chart — Technical Overview

> **SCD Patient Chart microfrontend for OpenMRS O3 / SSUUBO distro**
> Current version: **1.2.14** · Published on npm under the `@clinicemr` org.

---

## 1. What this project is

This repository is an **OpenMRS O3 microfrontend** (a.k.a. ESM — "extensible module") that adds a **Sickle-Cell Disease (SCD) patient chart** to an OpenMRS deployment. It provides:

- A **summary dashboard** showing the patient's general SCD information.
- An **edit form** covering every piece of SCD data (demographics, contacts, key clinical dates, treatments, siblings, primary diagnoses, photo).
- Persistence of all fields to the OpenMRS backend via the **REST** and **FHIR** APIs (using the standard Encounter / Observation / Person / Person-Attribute / Attachment endpoints).
- Integration points (extensions + routes) that let the patient chart shell automatically mount the SCD module.

It is designed to plug into any OpenMRS 3.x instance that runs the `@openmrs/esm-patient-chart-app`, and is deployed as part of the **SSUUBO EMR** distro via `spa-assemble-config.json`.

---

## 2. Project layout

```
openmrs-clinicemr-esm-patient-chart/               ← yarn workspace monorepo root
├── packages/
│   └── esm-patient-scd-chart/                     ← THIS microfrontend
│       ├── src/
│       │   ├── index.ts                           ← module entrypoint (extensions + pages)
│       │   ├── routes.json                        ← OpenMRS route + extension manifest
│       │   ├── config-schema.ts                   ← runtime-configurable UUIDs
│       │   ├── dashboard.meta.ts                  ← slot / path / title for sidebar
│       │   ├── root.component.tsx                 ← landing page (greeter + demos)
│       │   ├── boxes/, greeter/, patient-getter/  ← template demo components
│       │   └── scd-patient/                       ← the SCD feature itself
│       │       ├── types.ts                       ← domain types & diagnosis options
│       │       ├── scd-patient.resource.ts        ← all REST / SWR data access
│       │       ├── scd-patient-dashboard.component.tsx   ← summary dashboard
│       │       ├── scd-general-info-form.component.tsx   ← edit form
│       │       ├── scd-dashboard-link.component.tsx      ← sidebar nav link (in-chart)
│       │       └── scd-general-info-link.component.tsx   ← alternative link widget
│       ├── e2e/                                   ← Playwright tests
│       │   ├── specs/                             ← 5 spec files, 26 tests
│       │   ├── pages/                             ← page-object models
│       │   ├── core/, fixtures/, support/         ← test harness + API helpers
│       │   └── storageState.json                  ← auth state for tests
│       ├── translations/                          ← i18n JSON bundles
│       ├── webpack.config.js, playwright.config.ts, tsconfig.json, jest.config.js
│       └── release.sh                             ← helper that builds → publishes → hot-patches
└── (…other packages, mostly untouched template apps)
```

---

## 3. Tech stack & dependencies

| Layer | Technology |
|---|---|
| Language | **TypeScript 5.x** + **React 18** |
| UI library | **Carbon Design System** (`@carbon/react`, `@carbon/icons-react`) |
| Data fetching | **SWR** (`useSWR`) — cache + revalidate |
| HTTP client | `openmrsFetch` from `@openmrs/esm-framework` |
| Routing | `react-router-dom@6` (consumed via the patient-chart shell) |
| i18n | `react-i18next` + `i18next-parser` |
| Build | **Webpack 5** orchestrated by `openmrs build` CLI |
| Tests (unit) | **Jest 29** + `@testing-library/react` |
| Tests (e2e) | **Playwright** (`@playwright/test`) — Chromium only |
| Package mgr | **Yarn 4** (Berry) + Turborepo |
| Linting | ESLint + Prettier + Husky pre-commit |

### Declared dependencies

```json
"dependencies": {
  "@carbon/icons-react": "^11.68.0",
  "@carbon/react":       "^1.83.0",
  "lodash-es":           "^4.17.21"
},
"peerDependencies": {
  "@openmrs/esm-framework": "*",
  "dayjs":                 "1.x",
  "react":                 "18.x",
  "react-i18next":         "16.x",
  "react-router-dom":      "6.x",
  "rxjs":                  "6.x"
}
```

Peer dependencies are supplied by the OpenMRS app shell — the microfrontend does **not** bundle React or the framework.

---

## 4. Microfrontend anatomy

Every OpenMRS MF publishes three kinds of artefacts via `routes.json` and `index.ts`:

1. **Pages** — full-screen routes mounted at `/openmrs/spa/<route>`
2. **Extensions** — components that attach to named *slots* in other modules
3. **Config schema** — runtime-editable settings exposed in the Implementer Tools

### 4.1 `src/index.ts`
Calls `defineConfigSchema(moduleName, configSchema)` on startup, then exports every lazily-loaded React component through `getAsyncLifecycle(...)`. These named exports are what `routes.json` references.

### 4.2 `src/routes.json`
The manifest the app shell reads:

| Name | Slot | Component | Purpose |
|---|---|---|---|
| `scd-summary-dashboard` | `patient-chart-dashboard-slot` | `scdDashboardLink` | Adds **"SCD General Info"** link to the patient chart sidebar |
| `scd-patient-dashboard-widget` | `patient-chart-scd-dashboard-slot` | `scdPatientDashboard` | The actual dashboard widget rendered when that link is active |
| `scd-general-info-dashboard` | `scd-general-info-dashboard-slot` | `scdGeneralInfoLink` | Alternative link widget |
| (page) `scd-patient` | — | `scdPatientDashboard` | **Standalone** dashboard at `/spa/scd-patient?patientUuid=…` |

### 4.3 `src/config-schema.ts` — `Config` type
Every piece of OpenMRS metadata (**concept UUIDs, encounter-type UUID, location UUID, person-attribute-type UUIDs**) is declared here so admins can override them per-deployment in the Implementer Tools. Key fields:

- `scdEncounterTypeUuid` — UUID of the "SCD General Information" encounter type
- `scdLocationUuid` — default encounter location
- `registrationEncounterTypeUuid` — used to retrieve emergency-contact observations
- `emergencyContactConcepts.{parentGuardianPhone,spousePartnerPhone,emergencyContactPhone}`
- `conceptUuids.*` — **31 concept UUIDs** covering every form field (see §6)

---

## 5. Components — what each one does

### 5.1 `scd-patient-dashboard.component.tsx`  (`ScdPatientDashboard`)

The **read-only summary view**. It is rendered both as a standalone page and as a patient-chart widget; it auto-detects which mode it is in by inspecting `window.location.pathname`.

**Responsibilities:**
- Resolves the patient UUID from props → `?patientUuid=` query string → URL path (`/patient/<uuid>/chart/...`).
- Calls `useScdEncounter(patientUuid, scdEncounterTypeUuid)` to fetch the latest SCD encounter.
- Calls `usePersonDetails` for address / death date / phone numbers (these live on the **Person** record, not as obs).
- Calls `usePatientDemographics` for name + DOB.
- Merges everything into a single `patientData` state object via `useEffect`.
- Renders the dashboard cards (Hero, Contact Details, Key Dates, Treatments, Siblings, Primary Diagnoses).
- Switches into edit mode by mounting `<ScdGeneralInfoForm />` when **Edit Information** is clicked.
- Provides the **← Back to Patient Chart** button (visible only on the standalone page).

### 5.2 `scd-general-info-form.component.tsx`  (`ScdGeneralInfoForm`)

The **monolithic edit form** (~900 LOC, intentionally co-located so the entire SCD data model is editable from a single screen).

**Sections rendered:**

1. **Personal Details** — death date, address, contact numbers (n), comments.
2. **Photograph** — file picker → uploads to `/ws/rest/v1/attachment`.
3. **Siblings** — repeater with name, year of birth, tested-for-SCD, test result, SSUUBO No.
4. **Key Dates** — SCD diagnosis, SSUUBO enrollment, PCV vaccination.
5. **Treatments** — Hydroxyurea, Chronic Transfusion, Physiotherapy (each with an *enabled* checkbox + start/stop dates).
6. **Primary Diagnoses** — 9 checkboxes (SCD non-HU, SCD on HU, Conditional TCD, Abnormal TCD, Stroke, Splenomegaly, Chronic Sequestration, Osteonecrosis, Other) each with a diagnosed date; "Other" also has a free-text description.

**Validation (`validate` callback):**

- `address` — required.
- Phone numbers — match `^\+?[\d\s\-().]{7,}$`.
- Treatment start dates required when the treatment is enabled; stop date must be ≥ start.
- Each enabled diagnosis requires a diagnosed date; "Other" also requires a description.
- Sibling rows require name + year-of-birth and (if tested) a result.

**Submit flow (`handleSubmit`):**

1. Run `validate(form)`. If errors, set `errors` state and abort.
2. Call `saveScdEncounter(...)` — voids old obs, then writes new ones.
3. In parallel, `savePersonDetails(...)` and `saveContactNumbers(...)`.
4. If a photo file is staged, `uploadPatientPhoto(...)`.
5. On success: `setSaved(true)`, fire `onSave(form)` → parent dashboard re-fetches.
6. On error: surface `<InlineNotification kind="error">` (form stays mounted).

### 5.3 `scd-dashboard-link.component.tsx`  (`ScdDashboardLink`)

A tiny `<NavLink>` that the patient-chart shell drops into its sidebar. Routes to `${basePath}/SCD General Info` so clicking it activates `patient-chart-scd-dashboard-slot`.

### 5.4 `scd-general-info-link.component.tsx`
Alternate variant of the above, kept for compatibility with another slot configuration.

### 5.5 `root.component.tsx` + `boxes/`, `greeter/`, `patient-getter/`
These are **template leftovers** from `openmrs-esm-template-app` (red/blue/brand boxes, greeter, patient-getter). They are not part of the SCD feature but remain so the standalone `/openmrs/spa/root` page still renders for smoke-testing.

---

## 6. Data persistence model

Each form field maps to a specific OpenMRS storage location:

| Field | Storage | How |
|---|---|---|
| Patient name, DOB | `patient.person` | read-only via `usePatientDemographics` |
| Address | `person.addresses[preferred].address1` | `POST /person/{uuid}/address/{uuid}` |
| Death date | `person.deathDate` (+ `dead: true`) | `POST /person/{uuid}` |
| Contact numbers | Person attribute (type **`14d4f066-15f5-102d-96e4-000c29c2a5d7`** = "Telephone Number") | stored as a JSON-encoded string array (OpenMRS allows only one attribute per type, so all numbers are packed into one) |
| Photo | `attachment` resource | `POST /ws/rest/v1/attachment` (multipart) |
| Comments | obs (LONGTEXT) | inside the SCD encounter |
| SCD diagnosis date / SSUUBO enrollment date / PCV vaccination date | obs (Date) | flat obs in the SCD encounter |
| Siblings | obs (LONGTEXT) | JSON-stringified array under `conceptUuids.siblingsData` |
| Hydroxyurea / Chronic Transfusion / Physiotherapy | **obs group** | each group has an *enabled* (Boolean) member + start/stop date members |
| Primary diagnoses | **obs group(s)** | one group per enabled diagnosis; group members = the diagnosis concept (Date or Text) + optional `diagnosisDate` + optional `diagnosisOtherDescription` |

All clinical data lives inside a **single SCD encounter per patient** of type `scdEncounterTypeUuid`. On every save:

1. The existing encounter is fetched.
2. Every non-voided obs is **voided** (`DELETE /obs/{uuid}`).
3. Fresh obs are POSTed to the same encounter (`POST /encounter/{uuid}`).

This makes saves idempotent and prevents duplicate stale observations. If no encounter exists yet, a new one is created with `encounterDatetime = now`.

---

## 7. Resource layer — `scd-patient.resource.ts`

The single file that talks to OpenMRS. Public surface:

| Export | Type | Purpose |
|---|---|---|
| `useScdEncounter(patientUuid, encounterTypeUuid)` | SWR hook | Latest SCD encounter (auto-revalidates, exposes `mutate`) |
| `usePersonDetails(patientUuid)` | SWR hook | `address`, `deathDate`, `contactNumbers[]` |
| `usePatientDemographics(patientUuid)` | SWR hook | `patientName`, `patientDob` (FHIR `Patient`) |
| `saveScdEncounter(...)` | async fn | Create-or-update encounter (voids old obs first) |
| `savePersonDetails(uuid, address, deathDate)` | async fn | Update preferred address + person death status |
| `saveContactNumbers(uuid, phones[])` | async fn | Pack phones into the Telephone Number attribute |
| `uploadPatientPhoto(uuid, file)` | async fn | Multipart upload via attachment resource |
| `buildObsPayload(form, conceptUuids)` | pure fn | Form → obs[] (handles obs groups, null-safe UUIDs) |
| `mapEncounterToFormData(encounter, conceptUuids)` | pure fn | Encounter → form state (inverse of `buildObsPayload`) |

**Key safety techniques used here:**

- `isUuid()` guards every concept UUID before using it in a payload — protects against partial config.
- `obsGroup()` returns `null` when no valid members survive, preventing empty groups.
- A 2-pass save: try with full obs → on `getConcept()` errors fall back to `obs: []` (encounter is created/updated even if metadata is mis-configured, so the user is never blocked).
- The diagnosis concept may itself be **Date-typed** (stores the diagnosed date) **or Text-typed** (stores the literal `"true"`); the resource handles both shapes.

---

## 8. Type model — `types.ts`

```ts
ScdPatientGeneralInfo {
  deathDate, address, contactNumbers[], comments, photographyUrl, photographyFile,
  siblings: Sibling[],
  dateOfScdDiagnosis, dateOfSsuuboCareEnrollment, pcvVaccinationDate,
  hydroxyureaEnabled, hydroxyureaStartDate, hydroxyureaStopDate,
  chronicTransfusionEnabled, chronicTransfusionStartDate, chronicTransfusionStopDate,
  physiotherapyEnabled, physiotherapyStartDate, physiotherapyStopDate,
  primaryDiagnoses: PrimaryDiagnosis[],
}

Sibling { id, name, yearOfBirth, testedForScd: 'yes'|'no'|'', testResult: 'NA'|'negative'|'positive'|'', ssuuboNo }

PrimaryDiagnosis { key: DiagnosisKey, label, diagnosedDate, otherDescription? }

DiagnosisKey = 'scdNonHU' | 'scdOnHU' | 'conditionalTCD' | 'abnormalTCD'
             | 'stroke' | 'splenomegaly' | 'chronicSequestration' | 'osteonecrosis' | 'other'
```

`DIAGNOSIS_OPTIONS` and `initialFormState` are also exported so both the form and the resource agree on the canonical shape.

---

## 9. Build, test & release

### Build (production)
From `packages/esm-patient-scd-chart/`:

```bash
NODE_OPTIONS="--max-old-space-size=3072" \
  ../../node_modules/.bin/webpack --mode production
```

`webpack.config.js` removes `ForkTsCheckerWebpackPlugin` and disables source maps to keep the build under ~3 GB of RAM (it OOMs otherwise on dev machines).

### Unit tests
```bash
yarn test
```

### E2E tests
```bash
yarn test-e2e                # all 26 specs
npx playwright test e2e/specs/scd-full-workflow.spec.ts   # single file
```

The Playwright config records video for every test (`video: 'on'`) — `.webm` files land in `test-results/`.

#### E2E spec inventory

| Spec file | Tests | What it covers |
|---|---|---|
| `template-app.spec.ts` | 1 | Smoke check the template root page still loads |
| `scd-form-submission.spec.ts` | 9 | Saving each individual section (basic info, treatments, siblings, validation errors, updates, death date, diagnoses, network errors, refresh persistence) |
| `scd-dashboard.spec.ts` | 11 | Dashboard rendering — empty state, demographics, treatments, siblings, edit-mode navigation, back navigation, primary diagnoses, photo, refresh-after-update, loading skeleton |
| `scd-database-verification.spec.ts` | 4 | Hits the OpenMRS REST API directly to prove key dates / treatments / 9 diagnoses / full-form data is actually persisted (not just rendered) |
| `scd-full-workflow.spec.ts` | 1 | **End-to-end:** fills *every* form field with past dates, saves, navigates back to chart, reopens dashboard, asserts every datum is correctly displayed |

### Release / deploy

```bash
# 1. bump version in package.json
# 2. rebuild
NODE_OPTIONS="--max-old-space-size=3072" ../../node_modules/.bin/webpack --mode production
# 3. publish to npm
npm publish --access public --ignore-scripts
# 4. update distro
#    edit /home/.../SSUUBO/openmrs-ssuubo-emr/frontend/spa-assemble-config.json
#    "@clinicemr/esm-patient-scd-chart": "<new-version>"
# 5. hot-patch the running container
docker cp dist/. openmrs-ssuubo-emr-frontend-1:/usr/share/nginx/html/clinicemr-esm-patient-scd-chart-1.0.0/
```

`release.sh` automates steps 2-5.

---

## 10. Lifecycle — putting it all together

```
   Browser
   ──► /openmrs/spa/patient/<uuid>/chart/SCD General Info
        │
        ▼
   esm-patient-chart-app  (shell)
        │  reads patient-chart-dashboard-slot
        │  renders <ScdDashboardLink/> in sidebar
        │  on click, activates patient-chart-scd-dashboard-slot
        ▼
   <ScdPatientDashboard/>
        │
        ├─► useScdEncounter()   → GET /ws/rest/v1/encounter?patient=…
        ├─► usePersonDetails()  → GET /ws/rest/v1/person/<uuid>
        └─► usePatientDemographics() → GET /ws/fhir2/R4/Patient/<uuid>
        │
   user clicks "Edit Information"
        ▼
   <ScdGeneralInfoForm/>
        │  (fills form, submits)
        ▼
   saveScdEncounter()  ──► void old obs, POST new ones
   savePersonDetails() ──► POST /person address + dead/deathDate
   saveContactNumbers() ─► POST telephone person-attribute
   uploadPatientPhoto() ─► POST /attachment (multipart)
        │
        ▼
   onSave(data) → mutateEncounter() → SWR refetch → dashboard re-renders
```

---

## 11. Known constraints / gotchas

- **OOM during webpack build** on machines with < 4 GB free RAM. Mitigated by removing `ForkTsCheckerWebpackPlugin` and disabling source maps.
- **Single SCD encounter per patient** — there is no encounter history; every save edits the latest encounter in place.
- **One Telephone Number person-attribute** — multiple numbers are stored as a JSON array in the same attribute (OpenMRS limitation).
- **Concept-type ambiguity** — diagnosis concepts may be Date or Text; the resource handles both, but the configured concept in OpenMRS must match one of them.
- **CSS Modules** generate dynamic class names → E2E tests use semantic role-based selectors, never raw class names.
- The container path used for hot-patching is hardcoded as `clinicemr-esm-patient-scd-chart-1.0.0/` — that path is the *bundle directory name*, not the package version; do not change it when bumping versions.

---

## 12. Quick reference — file map

| Concern | File(s) |
|---|---|
| **Module entrypoint** | `src/index.ts`, `src/routes.json` |
| **Runtime config** | `src/config-schema.ts`, `src/dashboard.meta.ts` |
| **Domain types** | `src/scd-patient/types.ts` |
| **REST / SWR layer** | `src/scd-patient/scd-patient.resource.ts` |
| **UI — dashboard** | `src/scd-patient/scd-patient-dashboard.component.tsx` (+ `.scss`) |
| **UI — form** | `src/scd-patient/scd-general-info-form.component.tsx` (+ `.scss`) |
| **Sidebar links** | `src/scd-patient/scd-dashboard-link.component.tsx`, `scd-general-info-link.component.tsx` |
| **i18n bundles** | `translations/*.json` |
| **Unit tests** | `src/**/*.test.tsx` |
| **E2E tests** | `e2e/specs/*.spec.ts` |
| **E2E page objects** | `e2e/pages/*.ts` |
| **E2E fixtures / harness** | `e2e/core/`, `e2e/fixtures/`, `e2e/support/` |
| **Build config** | `webpack.config.js`, `tsconfig.json` |
| **Test config** | `jest.config.js`, `playwright.config.ts` |
| **Release script** | `release.sh` |
| **Distro pin** | `/home/tendo/bwongo-digital-solutions/SSUUBO/openmrs-ssuubo-emr/frontend/spa-assemble-config.json` |

---

*Last updated for v1.2.14.*
