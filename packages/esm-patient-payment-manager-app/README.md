# ESM Patient Payment Manager App

Role-aware payment manager for the OpenMRS CLINICEMR distro. Built on top of the
OpenMRS billing/cashier module (`/ws/rest/v1/cashier/*`).

## Features

1. **Billable-service dropdown with prices** — every billable service and its
   price is selectable on the consultation payment gate (`BillableServicePicker`).
2. **Consultation payment gate before registration** — Cashier / Receptionist /
   Organisation Nurse roles must record a consultation payment before they can
   register a patient. The `payment-manager-lockdown` guard redirects them to
   `payment-manager/consultation` if they hit `patient-registration` without a
   recorded payment. The fee is settled against the new patient automatically in
   the post-registration step.
3. **Provider lockdown** — Doctors, Pharmacists and Laboratory roles are blocked
   from `patient-registration` and all `payment-manager/*` pages.
4. **Pending payments queue** — Cashiers see all `PENDING` bills at
   `payment-manager/pending` and settle them with the Receive Payment modal.
5. **Order-basket payment requests** — when a clinician adds a drug/lab order,
   the `order-payment-panel` (in `order-basket-slot`) shows the matched price and
   a "Send for payment" button that creates a PENDING bill for the cashier queue.
   The order is intended to be completed after the patient pays.

## Roles

Configured via `cashierRoleNames` and `providerRoleNames` (see `config-schema.ts`).
Defaults: cashier roles = `Organizational: Nurse`, `Cashier`, `Receptionist`;
provider roles = Doctor / Pharmacist / Laboratory variants.

## Distro wiring

This app registers the `post-registration` page route and expects the
registration app's `submitButton` link to be
`${openmrsSpaBase}/post-registration/${patientUuid}`.

> **Important:** `@clinicemr/esm-post-registration-redirect-app` also registers
> the `post-registration` route. Do **not** enable both in the same distro — this
> app supersedes the redirect app. Remove the redirect app from
> `spa-assemble-config.json` (or exclude it) when enabling the payment manager.

Example `config-core_demo.json` block:

```json
"@clinicemr/esm-patient-payment-manager-app": {
  "cashierRoleNames": ["Organizational: Nurse", "Cashier", "Receptionist"],
  "providerRoleNames": ["Doctor", "Pharmacist", "Laboratory"],
  "consultationBillableServiceUuid": "<uuid-of-consultation-service>",
  "cashPointUuid": "<uuid-of-cash-point>",
  "defaultCurrency": "UGX"
}
```

## Build

```bash
NODE_OPTIONS="--max-old-space-size=3072" ../../node_modules/.bin/webpack --mode production
```
