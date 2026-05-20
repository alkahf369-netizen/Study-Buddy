export type ViolationReason =
  | 'tab_hidden'
  | 'window_blur'
  | 'fullscreen_exited'
  | 'app_backgrounded'
  | 'right_click'
  | 'clipboard_use';

export type SubmitReason = 'user_submitted' | 'time_expired' | ViolationReason;

export type AttemptStatus = 'in_progress' | 'submitted' | 'disqualified';

export type SessionStatus = 'active' | 'expired';

export type RunnerQuestion = {
  id: string;
  question: string;
  options: string[];
};

export type AttemptResultPayload = {
  attempt: {
    id: string;
    status: AttemptStatus;
    reason: string | null;
    score: number | null;
    percentage: number | null;
    elapsedSeconds: number | null;
    submittedAt: string | null;
    startedAt: string;
  };
  quiz: { id: string; title: string };
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correctAnswer?: string;
    explanation?: string;
    selected: string | null;
  }>;
  isOwnerView: boolean;
};
