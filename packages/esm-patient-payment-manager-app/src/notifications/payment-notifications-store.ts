/**
 * Local (localStorage-backed) per-user notification queue. Used to notify the
 * clinician who requested an order that the patient has completed the payment,
 * since there is no backend to push notifications. Notifications are addressed
 * to a user uuid and surfaced (toast + badge) when that user is logged in.
 */

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'clinicemr.paymentManager.notifications';
const MAX_PER_USER = 100;

export interface PaymentNotification {
  uuid: string;
  recipientUuid: string;
  title: string;
  message: string;
  patientUuid?: string;
  createdAt: number;
  read: boolean;
}

type Store = Record<string, PaymentNotification[]>;
type Listener = () => void;

const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

function readStore(): Store {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota errors */
  }
  emit();
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface AddNotificationArgs {
  recipientUuid: string;
  title: string;
  message: string;
  patientUuid?: string;
}

export function addNotification({ recipientUuid, title, message, patientUuid }: AddNotificationArgs): void {
  if (!recipientUuid) return;
  const store = readStore();
  const existing = store[recipientUuid] ?? [];
  const notification: PaymentNotification = {
    uuid: generateUuid(),
    recipientUuid,
    title,
    message,
    patientUuid,
    createdAt: Date.now(),
    read: false,
  };
  store[recipientUuid] = [notification, ...existing].slice(0, MAX_PER_USER);
  writeStore(store);
}

export function getNotifications(userUuid: string | undefined): PaymentNotification[] {
  if (!userUuid) return [];
  return readStore()[userUuid] ?? [];
}

export function markAllRead(userUuid: string | undefined): void {
  if (!userUuid) return;
  const store = readStore();
  const list = store[userUuid];
  if (!list?.length) return;
  store[userUuid] = list.map((n) => ({ ...n, read: true }));
  writeStore(store);
}

export function clearNotifications(userUuid: string | undefined): void {
  if (!userUuid) return;
  const store = readStore();
  delete store[userUuid];
  writeStore(store);
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Reactive hook returning the notifications addressed to the given user. */
export function useNotifications(userUuid: string | undefined) {
  const getSnapshot = useCallback(
    () => window.localStorage.getItem(STORAGE_KEY) ?? '{}',
    [],
  );
  const json = useSyncExternalStore(subscribe, getSnapshot, () => '{}');
  let notifications: PaymentNotification[] = [];
  if (userUuid) {
    try {
      const store = JSON.parse(json) as Store;
      notifications = store?.[userUuid] ?? [];
    } catch {
      notifications = [];
    }
  }
  const unreadCount = notifications.filter((n) => !n.read).length;
  return { notifications, unreadCount };
}
