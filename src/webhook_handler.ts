import crypto from 'crypto';
import type { SubscriptionEvent } from './types';
import type { Conditions } from './conditions';

/**
 * Тип обработчика события
 */
type EventHandler<T extends keyof Conditions> = (event: SubscriptionEvent<T>) => Promise<void> | void;

/**
 * Обработчики событий Twitch EventSub
 * Создается автоматически на основе типов из Conditions
 */
export type TwitchWebhookHandlers = {
    [K in keyof Conditions]?: EventHandler<K>;
} & {
    /**
     * Обработчик неизвестных типов событий
     */
    onUnknownEvent?: (event: SubscriptionEvent<keyof Conditions>) => Promise<void> | void;
};

/**
 * Глобальный реестр обработчиков событий
 */
const eventHandlers = new Map<
    keyof Conditions | '*',
    Set<(event: SubscriptionEvent<keyof Conditions>) => Promise<void> | void>
>();

/**
 * Опции для обработчика вебхука
 */
export interface TwitchWebhookOptions {
    /**
     * Секрет для проверки подписи (Twitch Client Secret)
     */
    secret: string;

    /**
     * Обработчики событий
     */
    handlers?: TwitchWebhookHandlers;
}

/**
 * Результат обработки вебхука
 */
export interface TwitchWebhookResult {
    /**
     * HTTP статус код
     */
    status: number;

    /**
     * HTTP заголовки ответа
     */
    headers?: Record<string, string>;

    /**
     * Тело ответа (для верификации)
     */
    body?: string;
}

/**
 * Типы событий для подписки
 */
export type EventType = keyof Conditions | '*';

/**
 * Регистрирует обработчик события
 * 
 * @param eventType - Тип события ('channel.subscribe', 'channel.chat.message', 'channel.channel_points_custom_reward_redemption.add' или '*' для всех событий)
 * @param handler - Функция-обработчик события
 * @returns Функция для отмены регистрации обработчика
 * 
 * @example
 * ```typescript
 * // Подписка на конкретное событие
 * const unsubscribe = on('channel.subscribe', async (event) => {
 *   console.log(`${event.event.user_name} subscribed`);
 * });
 * 
 * // Подписка на все события
 * on('*', async (event) => {
 *   console.log(`Event: ${event.subscription.type}`);
 * });
 * 
 * // Позже можно отменить регистрацию
 * unsubscribe();
 * ```
 */
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

/**
 * Алиас для функции on (более привычное название)
 */
export const subscribe = on;

/**
 * Обрабатывает вебхук от Twitch EventSub
 * 
 * @param request - Стандартный Request объект (Web API)
 * @param options - Опции обработчика
 * @returns Promise с результатом обработки
 * 
 * @example
 * ```typescript
 * const result = await handleTwitchWebhook(request, {
 *   secret: process.env.TWITCH_CLIENT_SECRET!,
 *   handlers: {
 *     onChannelSubscribe: async (event) => {
 *       console.log(`${event.event.user_name} subscribed`);
 *     }
 *   }
 * });
 * 
 * return new Response(result.body, {
 *   status: result.status,
 *   headers: result.headers
 * });
 * ```
 */
export async function handleTwitchWebhook(
    request: Request,
    options: TwitchWebhookOptions
): Promise<TwitchWebhookResult> {
    const { secret, handlers = {} } = options;

    // Получаем заголовки
    const messageId = request.headers.get('twitch-eventsub-message-id');
    const timestamp = request.headers.get('twitch-eventsub-message-timestamp');
    const signature = request.headers.get('twitch-eventsub-message-signature');
    const messageType = request.headers.get('twitch-eventsub-message-type');

    // Проверяем наличие обязательных заголовков
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

    // Получаем тело запроса
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

    // Проверяем подпись
    const message = messageId + timestamp + body;
    const hmac = `sha256=${getHmac(secret, message)}`;

    if (!verifyMessage(hmac, signature)) {
        return {
            status: 401,
            body: JSON.stringify({ error: 'Invalid signature' })
        };
    }

    // Обрабатываем в зависимости от типа сообщения
    switch (messageType) {
        case 'notification': {
            const notification = bodyJson as SubscriptionEvent<any>;

            // Получаем тип события
            const eventType = notification.subscription.type;

            // Вызываем обработчики из опций (используя ключи напрямую из Conditions)
            if (eventType in handlers) {
                const handler = handlers[eventType as keyof Conditions];
                if (handler) {
                    // Приводим к правильному типу для вызова
                    type HandlerType = EventHandler<keyof Conditions>;
                    await Promise.resolve((handler as HandlerType)(notification as SubscriptionEvent<keyof Conditions>));
                }
            }

            // Вызываем обработчик неизвестных событий, если тип не найден
            if (!(eventType in handlers) && handlers.onUnknownEvent) {
                await handlers.onUnknownEvent(notification);
            }

            // Вызываем все зарегистрированные обработчики для конкретного типа события
            const specificHandlers = eventHandlers.get(eventType);
            if (specificHandlers) {
                await Promise.all(
                    Array.from(specificHandlers).map(handler =>
                        Promise.resolve(handler(notification))
                    )
                );
            }

            // Вызываем обработчики для всех событий ('*')
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

        default: {
            return {
                status: 400,
                body: JSON.stringify({ error: `Invalid message type: ${messageType}` })
            };
        }
    }
}

/**
 * Вычисляет HMAC для сообщения
 */
function getHmac(secret: string, message: string): string {
    return crypto.createHmac('sha256', secret)
        .update(message)
        .digest('hex');
}

/**
 * Проверяет подпись сообщения с использованием timing-safe сравнения
 */
function verifyMessage(hmac: string, verifySignature: string): boolean {
    try {
        return crypto.timingSafeEqual(
            Buffer.from(hmac),
            Buffer.from(verifySignature)
        );
    } catch (e) {
        // Если длины не совпадают, timingSafeEqual выбросит ошибку
        return false;
    }
}
