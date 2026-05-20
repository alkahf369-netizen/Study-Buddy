"use client";
import { useEffect, useRef } from 'react';
import { classifyEvent } from '@/lib/test/classify-event';
import type { ViolationReason } from '@/lib/test/types';

type Props = {
  attemptId: string;
  containerRef: React.RefObject<HTMLElement | null>;
  onViolation: (reason: ViolationReason) => void;
};

export default function ProctoringClient({ attemptId, containerRef, onViolation }: Props) {
  const hasViolatedRef = useRef(false);

  useEffect(() => {
    const check = (eventType: string) => {
      if (hasViolatedRef.current) return;
      const snapshot = {
        visibilityState: document.visibilityState,
        hasFocus: document.hasFocus(),
        fullscreenElement: document.fullscreenElement,
        attemptStatus: 'in_progress',
      };
      const reason = classifyEvent(eventType, snapshot);
      if (reason) {
        hasViolatedRef.current = true;
        onViolation(reason);
      }
    };

    const onVisibility = () => check('visibilitychange');
    const onBlur = () => check('blur');
    const onPageHide = () => check('pagehide');
    const onFullscreen = () => check('fullscreenchange');

    const onContextMenu = (e: Event) => {
      e.preventDefault();
      check('contextmenu');
    };
    const onClipboard = (e: Event) => {
      e.preventDefault();
      check(e.type); // 'copy', 'cut', or 'paste'
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('fullscreenchange', onFullscreen);

    const container = containerRef.current;
    if (container) {
      container.addEventListener('contextmenu', onContextMenu);
      container.addEventListener('copy', onClipboard);
      container.addEventListener('cut', onClipboard);
      container.addEventListener('paste', onClipboard);
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('fullscreenchange', onFullscreen);
      if (container) {
        container.removeEventListener('contextmenu', onContextMenu);
        container.removeEventListener('copy', onClipboard);
        container.removeEventListener('cut', onClipboard);
        container.removeEventListener('paste', onClipboard);
      }
    };
  }, [attemptId, containerRef, onViolation]);

  return null; // headless component
}
