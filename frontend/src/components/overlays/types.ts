// components/overlays/types.ts
export type DailyWindow = {
  /** IANA timezone for evaluation; default "Europe/Oslo" */
  tz?: string;
  /** "HH:mm" 24h start time in tz */
  timeStart: string;
  /** "HH:mm" 24h end time in tz (can be earlier than start to mean overnight, e.g. 22:00→02:00) */
  timeEnd: string;
  /** Weekdays active: 0=Sun .. 6=Sat; omit for all days */
  days?: number[];
  /** Optional inclusive date range (local to tz), e.g. "2025-09-01" */
  dateFrom?: string; // "YYYY-MM-DD"
  /** Optional inclusive date range (local to tz) */
  dateTo?: string;   // "YYYY-MM-DD"
};

export type OverlayConfig = {
  id: string;
  label?: string;
  type: string;               // key to find the component in the registry
  /** Absolute schedule (legacy): shown when now ∈ [start, end) */
  start?: string;             // ISO 8601
  end?: string;               // ISO 8601
  /** NEW: daily recurring window */
  daily?: DailyWindow;

  zIndex?: number;            // default 2000
  capturesClicks?: boolean;   // default false
  props?: any;                // free-form props bag passed to the component
};

export type OverlayRuntimeProps = {
  id: string;
  zIndex: number;
  now: number;
  start: Date;
  end: Date;
  data: any;
  capturesClicks?: boolean;
};
