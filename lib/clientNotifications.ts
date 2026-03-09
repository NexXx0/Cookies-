export type AppNotification = {
  id: string;
  title: string;
  message: string;
  href?: string;
  createdAt: string;
  read?: boolean;
};

const STORAGE_KEY = "dueto_notifications";
const EVENT_NAME = "dueto-notifications-updated";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readAppNotifications(): AppNotification[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeAppNotifications(notifications: AppNotification[]) {
  if (!canUseStorage()) return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function pushAppNotifications(items: Omit<AppNotification, "id" | "createdAt" | "read">[]) {
  if (!canUseStorage() || items.length === 0) return;

  const current = readAppNotifications();
  const created = items.map((item, idx) => ({
    ...item,
    id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    read: false,
  }));

  writeAppNotifications([...created, ...current]);
}

export function markAllNotificationsRead() {
  const current = readAppNotifications();
  writeAppNotifications(current.map((item) => ({ ...item, read: true })));
}

export function clearAllNotifications() {
  writeAppNotifications([]);
}

export const notificationEventName = EVENT_NAME;
