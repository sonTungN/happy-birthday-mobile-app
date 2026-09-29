const PREFIX = "filmroll:";

/** localStorage can be blocked (private mode, previews…): every error is ignored and the site keeps working. */
export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(PREFIX + key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(PREFIX + key, value);
    } catch {
      /* nothing to do if it can't be saved */
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      /* nothing to do if it can't be removed */
    }
  },
};
