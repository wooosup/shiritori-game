import { appEnv } from '../config/env';

type TelemetryPrimitive = string | number | boolean | null;
export type TelemetryValue = TelemetryPrimitive | undefined;
export type TelemetryProps = Record<string, TelemetryValue>;

interface TelemetryProvider {
  trackEvent: (name: string, props: Record<string, TelemetryPrimitive>) => void;
  captureError: (error: Error, context: Record<string, TelemetryPrimitive>) => void;
  setUser: (user: TelemetryUser | null) => void;
}

interface QueuedEvent {
  name: string;
  props: Record<string, TelemetryPrimitive>;
}

interface QueuedError {
  error: Error;
  context: Record<string, TelemetryPrimitive>;
}

interface TelemetryUser {
  id: string;
}

const MAX_QUEUE_SIZE = 50;
const MAX_KEY_LENGTH = 64;
const MAX_STRING_VALUE_LENGTH = 120;
const SENSITIVE_KEY_PATTERN =
  /(token|password|secret|authorization|cookie|email|phone|session|nickname|user|name|key)/i;

const queuedEvents: QueuedEvent[] = [];
const queuedErrors: QueuedError[] = [];
let queuedUser: TelemetryUser | null | undefined;
let providers: TelemetryProvider[] = [];
let isInitialized = false;
let initPromise: Promise<void> | null = null;

function hasSentryConfig(): boolean {
  return appEnv.sentryDsn.length > 0;
}

function toSafeKey(input: string): string {
  return input.trim().slice(0, MAX_KEY_LENGTH).replace(/[^\w.:-]/g, '_');
}

function sanitizeValue(value: TelemetryValue): TelemetryPrimitive | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value.trim().slice(0, MAX_STRING_VALUE_LENGTH);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'boolean' || value === null) {
    return value;
  }

  return undefined;
}

function sanitizeProps(props?: TelemetryProps): Record<string, TelemetryPrimitive> {
  if (!props) {
    return {};
  }

  const safe: Record<string, TelemetryPrimitive> = {};

  for (const [rawKey, rawValue] of Object.entries(props)) {
    if (SENSITIVE_KEY_PATTERN.test(rawKey)) {
      continue;
    }

    const key = toSafeKey(rawKey);
    if (!key) {
      continue;
    }

    const value = sanitizeValue(rawValue);
    if (value === undefined) {
      continue;
    }

    safe[key] = value;
  }

  return safe;
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error.slice(0, MAX_STRING_VALUE_LENGTH));
  }

  return new Error('unknown_error');
}

function enqueueEvent(name: string, props: Record<string, TelemetryPrimitive>): void {
  if (queuedEvents.length >= MAX_QUEUE_SIZE) {
    queuedEvents.shift();
  }
  queuedEvents.push({ name, props });
}

function enqueueError(error: Error, context: Record<string, TelemetryPrimitive>): void {
  if (queuedErrors.length >= MAX_QUEUE_SIZE) {
    queuedErrors.shift();
  }
  queuedErrors.push({ error, context });
}

function applyQueuedUser(): void {
  if (queuedUser === undefined) {
    return;
  }

  for (const provider of providers) {
    provider.setUser(queuedUser);
  }
}

function flushQueues(): void {
  for (const event of queuedEvents.splice(0)) {
    for (const provider of providers) {
      provider.trackEvent(event.name, event.props);
    }
  }

  for (const queued of queuedErrors.splice(0)) {
    for (const provider of providers) {
      provider.captureError(queued.error, queued.context);
    }
  }

  applyQueuedUser();
}

function createConsoleProvider(): TelemetryProvider | null {
  if (!import.meta.env.DEV) {
    return null;
  }

  return {
    trackEvent: (name, props) => {
      console.info('[telemetry:event]', name, props);
    },
    captureError: (error, context) => {
      console.error('[telemetry:error]', error, context);
    },
    setUser: (user) => {
      if (user) {
        console.info('[telemetry:user]', user.id);
      } else {
        console.info('[telemetry:user]', 'cleared');
      }
    },
  };
}

async function createSentryProvider(): Promise<TelemetryProvider | null> {
  if (!hasSentryConfig()) {
    return null;
  }

  const Sentry = await import('@sentry/react');

  Sentry.init({
    dsn: appEnv.sentryDsn,
    environment: appEnv.sentryEnvironment || import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    maxBreadcrumbs: 20,
    beforeBreadcrumb: (breadcrumb) => {
      const category = typeof breadcrumb.category === 'string' ? breadcrumb.category : '';
      if (category.startsWith('xhr') || category.startsWith('fetch')) {
        return null;
      }
      return breadcrumb;
    },
  });

  return {
    trackEvent: (name, props) => {
      Sentry.addBreadcrumb({
        category: 'telemetry.event',
        level: 'info',
        message: name,
        data: props,
      });
    },
    captureError: (error, context) => {
      Sentry.withScope((scope) => {
        scope.setTag('telemetry', 'client');
        if (Object.keys(context).length > 0) {
          scope.setExtras(context);
        }
        Sentry.captureException(error);
      });
    },
    setUser: (user) => {
      Sentry.setUser(user ? { id: user.id } : null);
    },
  };
}

async function createProviders(): Promise<TelemetryProvider[]> {
  const resolved = await Promise.all([createConsoleProvider(), createSentryProvider()]);

  return resolved.filter((provider): provider is TelemetryProvider => provider !== null);
}

export async function initTelemetry(): Promise<void> {
  if (isInitialized) {
    return;
  }

  if (!initPromise) {
    initPromise = Promise.resolve()
      .then(async () => {
        providers = await createProviders();
        isInitialized = true;
        flushQueues();
      })
      .catch(() => {
        providers = [];
        isInitialized = true;
        flushQueues();
      });
  }

  await initPromise;
}

export function trackEvent(name: string, props?: TelemetryProps): void {
  const safeName = name.trim().slice(0, MAX_STRING_VALUE_LENGTH);
  if (!safeName) {
    return;
  }

  const safeProps = sanitizeProps(props);

  if (!isInitialized) {
    enqueueEvent(safeName, safeProps);
    void initTelemetry();
    return;
  }

  for (const provider of providers) {
    provider.trackEvent(safeName, safeProps);
  }
}

export function captureError(error: unknown, context?: TelemetryProps): void {
  const normalized = toError(error);
  const safeContext = sanitizeProps(context);

  if (!isInitialized) {
    enqueueError(normalized, safeContext);
    void initTelemetry();
    return;
  }

  for (const provider of providers) {
    provider.captureError(normalized, safeContext);
  }
}

export function setTelemetryUser(user: TelemetryUser | null): void {
  queuedUser = user;

  if (!isInitialized) {
    void initTelemetry();
    return;
  }

  applyQueuedUser();
}

export function isTelemetryEnabled(): boolean {
  return hasSentryConfig();
}
