import crypto from 'crypto';
import type { SubscriptionEvent } from './types';
import type { Conditions } from './conditions';

type EventHandler<T extends keyof Conditions> = (event: SubscriptionEvent<T>) => Promise<void> | void;

export type TwitchWebhookHandlers = {
    [K in keyof Conditions]?: EventHandler<K>;
} & {
    onUnknownEvent?: (event: SubscriptionEvent<keyof Conditions>) => Promise<void> | void;
};

const eventHandlers = new Map<
    keyof Conditions | '*',
    Set<(event: SubscriptionEvent<keyof Conditions>) => Promise<void> | void>
>();

export interface TwitchWebhookOptions {
    secret: string;
    handlers?: TwitchWebhookHandlers;
}

export interface TwitchWebhookResult {
    status: number;
    headers?: Record<string, string>;
    body?: string;
}

export type EventType = keyof Conditions | '*';

export function on<T extends keyof Conditions>(
    eventType: T,
    handler: EventHandler<T>
): () => void;
export function on(
    eventType: '*',
    handler: (event: SubscriptionEvent<keyof Conditions>) => Promise<void> | void
): () => void;
export function on(
    eventType: EventType,
    handler: (event: SubscriptionEvent<keyof Conditions>) => Promise<void> | void
): () => void {
    if (!eventHandlers.has(eventType)) {
        eventHandlers.set(eventType, new Set());
    }

    const handlers = eventHandlers.get(eventType)!;
    handlers.add(handler);

    return () => {
        handlers.delete(handler);
        if (handlers.size === 0) {
            eventHandlers.delete(eventType);
        }
    };
}

export const subscribe = on;

export async function handleTwitchWebhook(
    request: Request,
    options: TwitchWebhookOptions
): Promise<TwitchWebhookResult> {
    const { secret, handlers = {} } = options;

    const messageId = request.headers.get('twitch-eventsub-message-id');
    const timestamp = request.headers.get('twitch-eventsub-message-timestamp');
    const signature = request.headers.get('twitch-eventsub-message-signature');
    const messageType = request.headers.get('twitch-eventsub-message-type');

    if (!messageId || !timestamp) {
        return {
            status: 400,
            body: JSON.stringify({ error: 'Missing required headers "twitch-eventsub-message-id" or "twitch-eventsub-message-timestamp"' })
        };
    }

    if (!signature) {
        return {
            status: 400,
            body: JSON.stringify({ error: 'Missing required header "twitch-eventsub-message-signature"' })
        };
    }

    if (!messageType) {
        return {
            status: 400,
            body: JSON.stringify({ error: 'Missing required header "twitch-eventsub-message-type"' })
        };
    }

    const body = await request.text();
    let bodyJson: any;

    try {
        bodyJson = JSON.parse(body);
    } catch (e) {
        return {
            status: 400,
            body: JSON.stringify({ error: 'Invalid JSON body' })
        };
    }

    const message = messageId + timestamp + body;
    const hmac = `sha256=${getHmac(secret, message)}`;

    if (!verifyMessage(hmac, signature)) {
        return {
            status: 401,
            body: JSON.stringify({ error: 'Invalid signature' })
        };
    }

    switch (messageType) {
        case 'notification': {
            const notification = bodyJson as SubscriptionEvent<any>;

            const eventType = notification.subscription.type;

            if (eventType in handlers) {
                const handler = handlers[eventType as keyof Conditions];
                if (handler) {
                    type HandlerType = EventHandler<keyof Conditions>;
                    await Promise.resolve((handler as HandlerType)(notification as SubscriptionEvent<keyof Conditions>));
                }
            }

            if (!(eventType in handlers) && handlers.onUnknownEvent) {
                await handlers.onUnknownEvent(notification);
            }

            const specificHandlers = eventHandlers.get(eventType);
            if (specificHandlers) {
                await Promise.all(
                    Array.from(specificHandlers).map(handler =>
                        Promise.resolve(handler(notification))
                    )
                );
            }

            const allHandlers = eventHandlers.get('*');
            if (allHandlers) {
                await Promise.all(
                    Array.from(allHandlers).map(handler =>
                        Promise.resolve(handler(notification))
                    )
                );
            }

            return {
                status: 204
            };
        }

        case 'webhook_callback_verification': {
            const challenge = bodyJson.challenge;

            if (!challenge) {
                return {
                    status: 400,
                    body: JSON.stringify({ error: 'Missing challenge in verification request' })
                };
            }

            return {
                status: 200,
                headers: {
                    'content-type': 'text/plain'
                },
                body: challenge
            };
        }


        //make it better
        case "revocation" : {
            console.error(bodyJson);
            return {
                status: 204,
            }
        }

        default: {
            return {
                status: 400,
                body: JSON.stringify({ error: `Invalid message type: ${messageType}` })
            };
        }
    }
}

function getHmac(secret: string, message: string): string {
    return crypto.createHmac('sha256', secret)
        .update(message)
        .digest('hex');
}

function verifyMessage(hmac: string, verifySignature: string): boolean {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(verifySignature));
}
