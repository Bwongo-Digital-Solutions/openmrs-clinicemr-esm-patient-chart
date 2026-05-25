import type React from 'react';
import { useEffect } from 'react';
import { navigate, useConfig, useSession } from '@openmrs/esm-framework';
import type { PostRegistrationRedirectConfig } from './config-schema';

/**
 * Globally-mounted guard that restricts Registration Clerks to a small
 * allow-list of pages:
 *   - /patient-registration (create a new patient)
 *   - /my-registered-patients (list of patients they've registered)
 *   - /post-registration/* (the redirect gateway they land on post-save)
 *   - /login, /logout (auth pages)
 *
 * If they somehow land on any other URL (typed manually, clicked a stale
 * link, etc.) they are bounced back to /my-registered-patients.
 *
 * It also toggles a `registration-clerk-mode` class on <body> so CSS can
 * hide top-nav shortcuts (search, app switcher, etc.) for this role.
 */
const ALLOWED_PATH_PREFIXES = [
  'patient-registration',
  'my-registered-patients',
  'post-registration',
  'login',
  'logout',
];

const BODY_CLASS = 'registration-clerk-mode';
const STYLE_ELEMENT_ID = 'registration-clerk-lockdown-style';

// CSS that hides nav shortcuts. Uses broad, conservative selectors so we
// don't accidentally hide the user menu (needed to log out).
const LOCKDOWN_CSS = `
body.${BODY_CLASS} [data-testid="appSearchIconButton"],
body.${BODY_CLASS} [data-testid="appSearchBar"],
body.${BODY_CLASS} [data-testid="appMenuButton"],
body.${BODY_CLASS} [data-testid="offlineToolsMenuButton"],
body.${BODY_CLASS} [data-testid="implementerToolsIcon"] {
  display: none !important;
}
`;

function ensureStyleInjected() {
  if (document.getElementById(STYLE_ELEMENT_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = LOCKDOWN_CSS;
  document.head.appendChild(style);
}

function currentFirstPathSegment(): string {
  const path = window.location.pathname;
  // Strip any common OpenMRS SPA prefix like /openmrs/spa/
  const stripped = path.replace(/^\/openmrs\/spa\/?/, '').replace(/^\/+/, '');
  return (stripped.split('/')[0] || '').toLowerCase();
}

const RegistrationClerkLockdown: React.FC = () => {
  const session = useSession();
  const config = useConfig<PostRegistrationRedirectConfig>();

  useEffect(() => {
    if (!session?.user) return;

    const roles: string[] = (session.user.roles ?? []).map((r: { display?: string; name?: string }) =>
      String(r.display ?? r.name ?? ''),
    );
    const isClerk = roles.some(
      (role) => role.trim().toLowerCase() === config.registrationClerkRoleName.trim().toLowerCase(),
    );

    if (!isClerk) {
      document.body.classList.remove(BODY_CLASS);
      return;
    }

    document.body.classList.add(BODY_CLASS);
    ensureStyleInjected();

    const enforcePath = () => {
      const first = currentFirstPathSegment();
      if (!first) return; // landing on /openmrs/spa/ → let the home page handle it
      if (ALLOWED_PATH_PREFIXES.includes(first)) return;
      navigate({ to: `\${openmrsSpaBase}/${config.registeredPatientsListPath}` });
    };

    // Run once for the current URL and then on every single-spa route change.
    enforcePath();
    const handler = () => enforcePath();
    window.addEventListener('single-spa:before-routing-event', handler);
    window.addEventListener('popstate', handler);

    return () => {
      window.removeEventListener('single-spa:before-routing-event', handler);
      window.removeEventListener('popstate', handler);
    };
  }, [session, config.registrationClerkRoleName, config.registeredPatientsListPath]);

  return null;
};

export default RegistrationClerkLockdown;
