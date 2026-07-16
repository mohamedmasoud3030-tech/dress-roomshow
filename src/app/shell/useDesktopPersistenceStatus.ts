import { useEffect, useState } from 'react';
import {
  DESKTOP_SYNC_STATUS_EVENT,
  getDesktopSyncStatus,
  type DesktopSyncStatus,
} from '@platform/desktop';

export function useDesktopPersistenceStatus(): DesktopSyncStatus {
  const [status, setStatus] = useState<DesktopSyncStatus>(() => getDesktopSyncStatus());

  useEffect(() => {
    const updateStatus = (event: Event) => {
      setStatus((event as CustomEvent<DesktopSyncStatus>).detail);
    };

    window.addEventListener(DESKTOP_SYNC_STATUS_EVENT, updateStatus);
    return () => window.removeEventListener(DESKTOP_SYNC_STATUS_EVENT, updateStatus);
  }, []);

  return status;
}
