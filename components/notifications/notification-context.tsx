"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type NotificationType = "success" | "error";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
};

type NotificationContextValue = {
  notifications: Notification[];
  showNotification: (
    type: NotificationType,
    title: string,
    message?: string,
  ) => void;
  dismissNotification: (id: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

let nextId = 0;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback(
    (type: NotificationType, title: string, message?: string) => {
      const id = String(++nextId);
      setNotifications((prev) => [...prev, { id, type, title, message }]);

      setTimeout(() => {
        dismissNotification(id);
      }, 5000);
    },
    [dismissNotification],
  );

  return (
    <NotificationContext.Provider
      value={{ notifications, showNotification, dismissNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}
