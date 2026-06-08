import {
  addNotification,
  clearNotifications,
  getNotifications,
  markAllRead,
} from './payment-notifications-store';

describe('payment-notifications-store', () => {
  beforeEach(() => {
    clearNotifications('provider-1');
    clearNotifications('provider-2');
  });

  it('adds a notification addressed to a recipient', () => {
    addNotification({
      recipientUuid: 'provider-1',
      title: 'Payment concluded',
      message: 'Jane paid UGX 10,000',
      patientUuid: 'patient-1',
    });
    const list = getNotifications('provider-1');
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      recipientUuid: 'provider-1',
      title: 'Payment concluded',
      read: false,
      patientUuid: 'patient-1',
    });
  });

  it('does not add a notification without a recipient', () => {
    addNotification({ recipientUuid: '', title: 't', message: 'm' });
    expect(getNotifications('')).toHaveLength(0);
  });

  it('keeps notifications scoped per recipient', () => {
    addNotification({ recipientUuid: 'provider-1', title: 'a', message: 'a' });
    addNotification({ recipientUuid: 'provider-2', title: 'b', message: 'b' });
    expect(getNotifications('provider-1')).toHaveLength(1);
    expect(getNotifications('provider-2')).toHaveLength(1);
  });

  it('marks all notifications read for a user', () => {
    addNotification({ recipientUuid: 'provider-1', title: 'a', message: 'a' });
    addNotification({ recipientUuid: 'provider-1', title: 'b', message: 'b' });
    expect(getNotifications('provider-1').filter((n) => !n.read)).toHaveLength(2);
    markAllRead('provider-1');
    expect(getNotifications('provider-1').filter((n) => !n.read)).toHaveLength(0);
  });

  it('returns an empty list for an unknown user', () => {
    expect(getNotifications('nobody')).toEqual([]);
    expect(getNotifications(undefined)).toEqual([]);
  });
});
