const SNAPSHOT_PREFIX = 'openarena_closure_snapshot_';

export const getMonthSnapshotKey = (adminId, monthYear) => {
  return `${SNAPSHOT_PREFIX}${adminId || 'global'}_${monthYear}`;
};

export const saveMonthSnapshot = (adminId, monthYear, data) => {
  if (!monthYear) return null;
  try {
    const key = getMonthSnapshotKey(adminId, monthYear);
    const existing = getMonthSnapshot(adminId, monthYear) || {};
    const payload = {
      ...existing,
      ...data,
      monthYear,
      adminId,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(payload));
    return payload;
  } catch (err) {
    console.warn('Error saving month closure snapshot to localStorage:', err);
    return null;
  }
};

export const getMonthSnapshot = (adminId, monthYear) => {
  if (!monthYear) return null;
  try {
    const key = getMonthSnapshotKey(adminId, monthYear);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Error reading month closure snapshot from localStorage:', err);
    return null;
  }
};

export const hasMonthSnapshot = (adminId, monthYear) => {
  if (!monthYear) return false;
  try {
    const key = getMonthSnapshotKey(adminId, monthYear);
    return Boolean(localStorage.getItem(key));
  } catch {
    return false;
  }
};

export const deleteMonthSnapshot = (adminId, monthYear) => {
  if (!monthYear) return;
  try {
    const key = getMonthSnapshotKey(adminId, monthYear);
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('Error deleting month closure snapshot:', err);
  }
};
