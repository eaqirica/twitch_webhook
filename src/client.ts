import type { Conditions } from "./conditions";
import type { Subscription, SubscriptionFilter, TwitchAuthResponse } from "./types";

export const TWITCH_API_URL = "https://api.twitch.tv/helix/";
export const TWITCH_AUTH_URL = "https://id.twitch.tv/oauth2/token";

export interface WebhookClientOptions {
    clientId: string;
    token?: string;
    callback: string;
    secret: string;
}

export class Webhook_client {
    private client_id: string;
    private token?: string;
    private callback: string;
    private secret: string;

    constructor(options: WebhookClientOptions) {
        this.client_id = options.clientId;
        this.token = options.token || "INVALID_TOKEN";
        this.callback = options.callback;
        this.secret = options.secret;
    }

    async auth() {
        const url = new URL(TWITCH_AUTH_URL);
        url.searchParams.append("client_id", this.client_id);
        url.searchParams.append("client_secret", this.secret);
        url.searchParams.append("grant_type", "client_credentials");

        const auth_request = await fetch(url, {
            method: "POST",
        });

        const json = await auth_request.json() as TwitchAuthResponse;

        if (!auth_request.ok) {
            console.error(`Failed to authenticate`);
            console.error(json);
            return;
        }

        this.token = json.access_token;

        return this.token;
    }

    
    async subscribe<K extends keyof Conditions>(event: K, condition: Conditions[K], userToken?: string) {

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

        const token = userToken || this.token;

        const subscription_request = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
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