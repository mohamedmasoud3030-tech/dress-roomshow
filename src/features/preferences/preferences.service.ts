import { readCollection, writeCollection } from '../../services/localDatabase';

export type AppPreferences = {
  showroomName: string;
  reservationBufferDays: number;
  dormantDressDays: number;
};

const COLLECTION = 'preferences';

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  showroomName: 'LENA',
  reservationBufferDays: 1,
  dormantDressDays: 90,
};

function normalizePreferences(value?: Partial<AppPreferences>): AppPreferences {
  const reservationBufferDays = Number(value?.reservationBufferDays ?? DEFAULT_APP_PREFERENCES.reservationBufferDays);
  const dormantDressDays = Number(value?.dormantDressDays ?? DEFAULT_APP_PREFERENCES.dormantDressDays);

  return {
    showroomName: value?.showroomName?.trim() || DEFAULT_APP_PREFERENCES.showroomName,
    reservationBufferDays:
      Number.isInteger(reservationBufferDays) && reservationBufferDays >= 0 && reservationBufferDays <= 14
        ? reservationBufferDays
        : DEFAULT_APP_PREFERENCES.reservationBufferDays,
    dormantDressDays:
      Number.isInteger(dormantDressDays) && dormantDressDays >= 1 && dormantDressDays <= 3650
        ? dormantDressDays
        : DEFAULT_APP_PREFERENCES.dormantDressDays,
  };
}

export function getAppPreferences(): AppPreferences {
  return normalizePreferences(readCollection<Partial<AppPreferences>>(COLLECTION, [DEFAULT_APP_PREFERENCES])[0]);
}

export function saveAppPreferences(input: AppPreferences): AppPreferences {
  const normalized = normalizePreferences(input);
  if (!input.showroomName.trim()) throw new Error('اسم المعرض مطلوب.');
  if (!Number.isInteger(input.reservationBufferDays) || input.reservationBufferDays < 0 || input.reservationBufferDays > 14) {
    throw new Error('أيام الفاصل الزمني للحجز يجب أن تكون رقماً بين 0 و 14.');
  }
  if (!Number.isInteger(input.dormantDressDays) || input.dormantDressDays < 1 || input.dormantDressDays > 3650) {
    throw new Error('أيام اعتبار الفستان خاملاً يجب أن تكون رقماً موجباً.');
  }

  writeCollection(COLLECTION, [normalized]);
  return normalized;
}
