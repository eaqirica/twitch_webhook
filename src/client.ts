import type { Conditions } from "./conditions";
import type { Subscription, SubscriptionFilter } from "./types";

export const TWITCH_API_URL = "https://api.twitch.tv/helix/";

export interface WebhookClientOptions {
    clientId: string;
    token: string;
    callback: string;
    secret: string;
}

export class Webhook_client {
    private client_id: string;
    private token: string;
    private callback: string;
    private secret: string;

    constructor(options: WebhookClientOptions) {
        this.client_id = options.clientId;
        this.token = options.token;
        this.callback = options.callback;
        this.secret = options.secret;
    }

    async subscribe<K extends keyof Conditions>(event: K, condition: Conditions[K]) {

        const url = new URL("eventsub/subscriptions", TWITCH_API_URL);

        const subscription: Subscription<K> = {
            version: "1",
            condition,
            transport: {
                method: "webhook",
                callback: this.callback,
                secret: this.secret
            },
            type: event
        }

        const subscription_request = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.token}`,
                "Content-Type": "application/json",
                "Client-Id": this.client_id
            },
            body: JSON.stringify(subscription)
        });


        if (!subscription_request.ok) {
            console.error(`Failed to subscribe to event`);

            const json = await subscription_request.json();

            console.error(json);
            return
        }

        const json = await subscription_request.json();

        return json;

    }

    async unsubscribe(subscription_id: string) {

        const url = new URL("eventsub/subscriptions", TWITCH_API_URL);

        url.searchParams.append("id", subscription_id);

        const unsubscribe_request = await fetch(url, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${this.token}`,
                "Content-Type": "application/json",
                "Client-Id": this.client_id
            },
        });

        if (!unsubscribe_request.ok) {
            console.error(`Failed to unsubscribe from event`);
        }
    }

    async get_subscriptions(): Promise<any>;
    async get_subscriptions(filter: SubscriptionFilter, value: string): Promise<any>;
    async get_subscriptions(filter?: SubscriptionFilter, value?: string): Promise<any> {
        const url = new URL("eventsub/subscriptions", TWITCH_API_URL);

        if (filter === "status" && value) {
            url.searchParams.append(filter, value);
        }

        if (filter === "type" && value) {
            url.searchParams.append(filter, value);
        }

        const get_subscriptions_request = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${this.token}`,
                "Content-Type": "application/json",
                "Client-Id": this.client_id
            },
        });

        if (!get_subscriptions_request.ok) {
            console.error(`Failed to get subscriptions`);
        }

        return await get_subscriptions_request.json();
    }
}