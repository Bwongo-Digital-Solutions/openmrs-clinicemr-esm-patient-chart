import React from 'react';
import { BrowserRouter, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HealthCross } from '@carbon/react/icons';
import { scdDashboardMeta } from '../dashboard.meta';

interface ScdDashboardLinkProps {
  basePath: string;
}

const ScdDashboardLink: React.FC<ScdDashboardLinkProps> = ({ basePath }) => {
  const { t } = useTranslation();
  const to = `${basePath}/${scdDashboardMeta.path}`;

  return (
    <BrowserRouter>
      <NavLink
        to={to}
        className={({ isActive }) =>
          ['cds--side-nav__link', isActive ? 'cds--side-nav__link--current' : ''].filter(Boolean).join(' ')
        }
        end
      >
        <HealthCross className="cds--side-nav__icon" size={20} />
        <span className="cds--side-nav__link-text">{t('scdGeneralInfo', scdDashboardMeta.title)}</span>
      </NavLink>
    </BrowserRouter>
  );
};

export default ScdDashboardLink;
