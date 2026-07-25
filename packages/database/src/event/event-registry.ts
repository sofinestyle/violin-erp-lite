import type { EventEnvelope, EventJson } from "./prisma-event-repository.js";

export type EventHandlerContext = Readonly<{
  attemptCount: number;
  consumerName: string;
  consumptionId: string;
  event: EventEnvelope;
  handlerName: string;
  requestTraceId: string;
}>;

export type EventDeliveryContext = Readonly<{
  attemptCount: number;
  deliveryId: string;
  event: EventEnvelope;
  requestTraceId: string;
  target: EventDeliveryTargetRegistration;
}>;

export type EventHandler = (context: EventHandlerContext) => Promise<void> | void;

export type EventDeliveryHandler = (
  context: EventDeliveryContext,
) => Promise<EventJson | null | undefined> | EventJson | null | undefined;

export type EventConsumerRegistration = Readonly<{
  consumerName: string;
  eventType: string;
  handler: EventHandler;
  handlerName?: string;
  maxAttempts?: number;
}>;

export type EventDeliveryTargetRegistration = Readonly<{
  deliver: EventDeliveryHandler;
  eventType: string;
  maxAttempts?: number;
  target: string;
  targetType: string;
}>;

function assertNonEmpty(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${name} must not be empty`);
  }
}

export class EventRegistry {
  readonly #consumersByEventType = new Map<string, EventConsumerRegistration[]>();
  readonly #deliveriesByEventType = new Map<string, EventDeliveryTargetRegistration[]>();

  registerConsumer(registration: EventConsumerRegistration): void {
    assertNonEmpty(registration.eventType, "Event type");
    assertNonEmpty(registration.consumerName, "Event consumer name");
    const registrations = this.#consumersByEventType.get(registration.eventType) ?? [];
    if (registrations.some((item) => item.consumerName === registration.consumerName)) {
      throw new Error("Event consumer is already registered for this event type");
    }
    registrations.push(registration);
    this.#consumersByEventType.set(registration.eventType, registrations);
  }

  registerDeliveryTarget(registration: EventDeliveryTargetRegistration): void {
    assertNonEmpty(registration.eventType, "Event type");
    assertNonEmpty(registration.targetType, "Event delivery target type");
    assertNonEmpty(registration.target, "Event delivery target");
    const registrations = this.#deliveriesByEventType.get(registration.eventType) ?? [];
    if (
      registrations.some(
        (item) =>
          item.targetType === registration.targetType && item.target === registration.target,
      )
    ) {
      throw new Error("Event delivery target is already registered for this event type");
    }
    registrations.push(registration);
    this.#deliveriesByEventType.set(registration.eventType, registrations);
  }

  getConsumers(eventType: string): readonly EventConsumerRegistration[] {
    return this.#consumersByEventType.get(eventType) ?? [];
  }

  getConsumer(eventType: string, consumerName: string): EventConsumerRegistration | null {
    return (
      this.getConsumers(eventType).find((consumer) => consumer.consumerName === consumerName) ??
      null
    );
  }

  getDeliveryTargets(eventType: string): readonly EventDeliveryTargetRegistration[] {
    return this.#deliveriesByEventType.get(eventType) ?? [];
  }

  getDeliveryTarget(
    eventType: string,
    targetType: string,
    target: string,
  ): EventDeliveryTargetRegistration | null {
    return (
      this.getDeliveryTargets(eventType).find(
        (registration) => registration.targetType === targetType && registration.target === target,
      ) ?? null
    );
  }
}
