"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type NotificationType = "success" | "error";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  visible: boolean;
};

type NotificationContextValue = {
  notifications: Notification[];
  showNotification: (
    type: NotificationType,
    title: string,
    message?: string,
  ) => void;
  dismissNotification: (id: string) => void;
  removeNotification: (id: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

let nextId = 0;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, visible: false } : n)),
    );
  }, []);

  const showNotification = useCallback(
    (type: NotificationType, title: string, message?: string) => {
      const id = String(++nextId);
      setNotifications((prev) => [
        ...prev,
        { id, type, title, message, visible: true },
      ]);

      const timer = setTimeout(() => {
        timersRef.current.delete(id);
        dismissNotification(id);
      }, 5000);
      timersRef.current.set(id, timer);
    },
    [dismissNotification],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        showNotification,
        dismissNotification,
        removeNotification,
      }}
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
