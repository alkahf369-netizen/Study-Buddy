import type { ViolationReason } from './types';

/**
 * Classifies a browser event into a ViolationReason or null.
 * This function is pure and referentially transparent.
 */
export function classifyEvent(
  eventType: string,
  snapshot: {
    visibilityState: string;
    hasFocus: boolean;
    fullscreenElement: unknown | null;
    attemptStatus: string;
  }
): ViolationReason | null {
  switch (eventType) {
    case 'visibilitychange':
      return snapshot.visibilityState === 'hidden' ? 'tab_hidden' : null;

    case 'blur':
      return snapshot.hasFocus === false ? 'window_blur' : null;

    case 'pagehide':
      return 'app_backgrounded';

    case 'fullscreenchange':
      return snapshot.fullscreenElement === null && snapshot.attemptStatus === 'in_progress'
        ? 'fullscreen_exited'
        : null;

    case 'contextmenu':
      return 'right_click';

    case 'copy':
    case 'cut':
    case 'paste':
      return 'clipboard_use';

    default:
      return null;
  }
}
