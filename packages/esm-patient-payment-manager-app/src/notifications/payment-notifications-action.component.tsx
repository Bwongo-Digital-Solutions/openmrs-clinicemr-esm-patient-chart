import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, HeaderGlobalAction } from '@carbon/react';
import { Notification, NotificationNew } from '@carbon/react/icons';
import { formatDate, showNotification, useSession } from '@openmrs/esm-framework';
import {
  markAllRead,
  useNotifications,
  type PaymentNotification,
} from './payment-notifications-store';
import styles from '../payment-manager.scss';

/**
 * Top-navigation action that surfaces payment-concluded notifications to the
 * clinician who requested an order. Shows an unread badge, raises a toast when
 * a new notification arrives, and lists recent notifications in a popover.
 */
const PaymentNotificationsAction: React.FC = () => {
  const { t } = useTranslation();
  const session = useSession();
  const userUuid = session?.user?.uuid;
  const { notifications, unreadCount } = useNotifications(userUuid);
  const [open, setOpen] = useState(false);
  const seenUuids = useRef<Set<string>>(new Set());
  const initialised = useRef(false);

  // Raise a toast for any newly-arrived unread notification (but not for the
  // backlog already present on first render).
  useEffect(() => {
    if (!initialised.current) {
      notifications.forEach((n) => seenUuids.current.add(n.uuid));
      initialised.current = true;
      return;
    }
    notifications
      .filter((n) => !n.read && !seenUuids.current.has(n.uuid))
      .forEach((n: PaymentNotification) => {
        seenUuids.current.add(n.uuid);
        showNotification({ kind: 'success', title: n.title, description: n.message });
      });
  }, [notifications]);

  if (!userUuid || notifications.length === 0) {
    return null;
  }

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      markAllRead(userUuid);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <HeaderGlobalAction aria-label={t('paymentNotifications', 'Payment notifications')} onClick={toggle}>
        {unreadCount > 0 ? <NotificationNew size={20} /> : <Notification size={20} />}
      </HeaderGlobalAction>
      {unreadCount > 0 && (
        <span
          className={styles.badge}
          style={{ position: 'absolute', top: 4, right: 4, pointerEvents: 'none' }}
        >
          {unreadCount}
        </span>
      )}
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            width: '22rem',
            maxHeight: '24rem',
            overflowY: 'auto',
            background: 'var(--cds-layer, #fff)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            zIndex: 9000,
          }}
        >
          <div className={styles.notificationItem} style={{ fontWeight: 600 }}>
            {t('paymentNotifications', 'Payment notifications')}
          </div>
          {notifications.map((n) => (
            <div key={n.uuid} className={styles.notificationItem}>
              <div style={{ fontWeight: 600 }}>{n.title}</div>
              <div>{n.message}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{formatDate(new Date(n.createdAt))}</div>
            </div>
          ))}
          <div style={{ padding: '0.5rem 1rem' }}>
            <Button kind="ghost" size="sm" onClick={() => setOpen(false)}>
              {t('close', 'Close')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentNotificationsAction;
