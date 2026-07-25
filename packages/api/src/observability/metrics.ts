export type MetricPrimitive = boolean | number | string;
export type MetricLabels = Readonly<Record<string, MetricPrimitive>>;
export type MetricKind = "counter" | "gauge" | "histogram";

export type CounterSnapshot = Readonly<{
  kind: "counter";
  labels: MetricLabels;
  name: string;
  value: number;
}>;

export type GaugeSnapshot = Readonly<{
  kind: "gauge";
  labels: MetricLabels;
  name: string;
  value: number;
}>;

export type HistogramSnapshot = Readonly<{
  count: number;
  kind: "histogram";
  labels: MetricLabels;
  max: number | null;
  min: number | null;
  name: string;
  sum: number;
}>;

export type MetricSnapshot = CounterSnapshot | GaugeSnapshot | HistogramSnapshot;

export type MetricsRegistry = Readonly<{
  incrementCounter: (name: string, labels?: MetricLabels, value?: number) => void;
  observeHistogram: (name: string, value: number, labels?: MetricLabels) => void;
  setGauge: (name: string, value: number, labels?: MetricLabels) => void;
  snapshot: () => readonly MetricSnapshot[];
}>;

type MutableHistogram = {
  count: number;
  max: number | null;
  min: number | null;
  sum: number;
};

const METRIC_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
const LABEL_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

function assertMetricName(name: string): void {
  if (!METRIC_NAME_PATTERN.test(name)) {
    throw new TypeError("Metric name must use lowercase snake_case");
  }
}

function normalizeLabels(labels: MetricLabels = {}): MetricLabels {
  const entries = Object.entries(labels).sort(([left], [right]) => left.localeCompare(right));
  const normalized: Record<string, MetricPrimitive> = {};

  for (const [key, value] of entries) {
    if (!LABEL_NAME_PATTERN.test(key)) {
      throw new TypeError("Metric label name must use lowercase snake_case");
    }
    normalized[key] = value;
  }

  return Object.freeze(normalized);
}

function metricKey(name: string, labels: MetricLabels): string {
  return JSON.stringify([name, labels]);
}

function assertFiniteMetricValue(value: number): void {
  if (!Number.isFinite(value)) {
    throw new TypeError("Metric value must be finite");
  }
}

export class InMemoryMetricsRegistry implements MetricsRegistry {
  readonly #counters = new Map<string, CounterSnapshot>();
  readonly #gauges = new Map<string, GaugeSnapshot>();
  readonly #histograms = new Map<string, HistogramSnapshot>();

  incrementCounter(name: string, labels: MetricLabels = {}, value = 1): void {
    assertMetricName(name);
    assertFiniteMetricValue(value);
    if (value < 0) throw new TypeError("Counter increment must not be negative");
    const normalizedLabels = normalizeLabels(labels);
    const key = metricKey(name, normalizedLabels);
    const current = this.#counters.get(key);
    this.#counters.set(
      key,
      Object.freeze({
        kind: "counter",
        labels: normalizedLabels,
        name,
        value: (current?.value ?? 0) + value,
      }),
    );
  }

  setGauge(name: string, value: number, labels: MetricLabels = {}): void {
    assertMetricName(name);
    assertFiniteMetricValue(value);
    const normalizedLabels = normalizeLabels(labels);
    this.#gauges.set(
      metricKey(name, normalizedLabels),
      Object.freeze({ kind: "gauge", labels: normalizedLabels, name, value }),
    );
  }

  observeHistogram(name: string, value: number, labels: MetricLabels = {}): void {
    assertMetricName(name);
    assertFiniteMetricValue(value);
    const normalizedLabels = normalizeLabels(labels);
    const key = metricKey(name, normalizedLabels);
    const current = this.#histograms.get(key) as MutableHistogram | undefined;
    const next: HistogramSnapshot = Object.freeze({
      count: (current?.count ?? 0) + 1,
      kind: "histogram",
      labels: normalizedLabels,
      max:
        current?.max === null || current?.max === undefined ? value : Math.max(current.max, value),
      min:
        current?.min === null || current?.min === undefined ? value : Math.min(current.min, value),
      name,
      sum: (current?.sum ?? 0) + value,
    });
    this.#histograms.set(key, next);
  }

  snapshot(): readonly MetricSnapshot[] {
    return Object.freeze([
      ...this.#counters.values(),
      ...this.#gauges.values(),
      ...this.#histograms.values(),
    ]);
  }
}

export class NoopMetricsRegistry implements MetricsRegistry {
  incrementCounter(): void {
    return undefined;
  }

  observeHistogram(): void {
    return undefined;
  }

  setGauge(): void {
    return undefined;
  }

  snapshot(): readonly MetricSnapshot[] {
    return [];
  }
}

export const defaultMetricsRegistry = new InMemoryMetricsRegistry();
