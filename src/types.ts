import type { Conditions } from "./conditions";
import type { Events } from "./events"; 


export type TwitchAuthResponse = {
    access_token: string;
    expires_in: number;
    token_type: string;
}

export type WebhookTransport = {
    method: "webhook";
    callback: string;
    secret: string;
};

export type NotificationSubscription<C extends keyof Conditions, Transport> = {
    id: string;
    status: string;
    type: C;
    version: string;
    condition: Conditions[C];
    transport: Transport;
    created_at: Date;
    cost: number
    event: Events[C]
};

type _SubscriptionFilter = "id" | "status" | "cost" | "created_at" | "event";

export type Subscription<K extends keyof Conditions> = Omit<NotificationSubscription<K, WebhookTransport>, _SubscriptionFilter>;

export type SubscriptionEvent<K extends keyof Conditions> = {
    subscription: NotificationSubscription<K, WebhookTransport>,
    event: Events[K]
}

export type SubscriptionStatus<K extends keyof Conditions> = {
    data: Subscription<K>[],
    total: number,
    total_cost: number,
    max_total_cost: number
};

export type SubscriptionFilter = "status" | "type";