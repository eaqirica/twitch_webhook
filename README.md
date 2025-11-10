# Twitch EventSub Webhook Handler

A TypeScript library for handling Twitch EventSub webhooks with type-safe event handling and automatic signature verification. Built for Bun runtime.

## Features

- 🔒 **Automatic signature verification** - Validates webhook signatures using HMAC-SHA256
- 🎯 **Type-safe event handling** - Full TypeScript support for all event types
- 📡 **Event subscription management** - Easy subscribe/unsubscribe to Twitch events
- 🎨 **Flexible event handlers** - Support for specific event types or catch-all handlers
- ✅ **Webhook verification** - Handles Twitch's webhook callback verification automatically

## Supported Events

- `channel.subscribe` - New channel subscriptions
- `channel.follow` - New channel follows
- `channel.chat.message` - Chat messages
- `channel.channel_points_custom_reward_redemption.add` - Channel point redemptions

## Installation

```bash
bun install
```

## Quick Start

### 1. Set up webhook handler

```typescript
import { handleTwitchWebhook, on } from './index';

// Register event handlers
on('channel.subscribe', async (event) => {
  console.log(`${event.event.user_name} subscribed to ${event.event.broadcaster_user_name}!`);
});

on('channel.chat.message', async (event) => {
  console.log(`${event.event.chatter_user_name}: ${event.event.message.text}`);
});

// Handle incoming webhook requests
export default {
  async fetch(request: Request) {
    const result = await handleTwitchWebhook(request, {
      secret: process.env.TWITCH_CLIENT_SECRET!,
    });

    return new Response(result.body, {
      status: result.status,
      headers: result.headers,
    });
  }
};
```

### 2. Subscribe to events

```typescript
import { Webhook_client } from './index';

const client = new Webhook_client(
  process.env.TWITCH_CLIENT_ID!,
  process.env.TWITCH_ACCESS_TOKEN!,
  'https://your-domain.com/webhook', // Your webhook callback URL
  process.env.TWITCH_CLIENT_SECRET!
);

// Subscribe to channel subscribe events
await client.subscribe('channel.subscribe', {
  broadcaster_user_id: '123456789'
});

// Subscribe to chat messages
await client.subscribe('channel.chat.message', {
  broadcaster_user_id: '123456789',
  user_id: '987654321' // Optional: filter by specific user
});
```

## API Reference

### `handleTwitchWebhook(request, options)`

Processes incoming Twitch webhook requests with signature verification.

**Parameters:**
- `request: Request` - The incoming webhook request
- `options: TwitchWebhookOptions`
  - `secret: string` - Your Twitch Client Secret for signature verification
  - `handlers?: TwitchWebhookHandlers` - Optional event handlers (can also use `on()` function)

**Returns:** `Promise<TwitchWebhookResult>` - Result with status, headers, and body

### `on(eventType, handler)`

Registers an event handler for a specific event type.

**Parameters:**
- `eventType: EventType` - The event type to listen for (e.g., `'channel.subscribe'`) or `'*'` for all events
- `handler: EventHandler` - The handler function

**Returns:** `() => void` - Unsubscribe function

**Example:**
```typescript
// Subscribe to specific event
const unsubscribe = on('channel.subscribe', async (event) => {
  console.log('New subscription!', event);
});

// Subscribe to all events
on('*', async (event) => {
  console.log('Event received:', event.subscription.type);
});

// Unsubscribe later
unsubscribe();
```

### `subscribe(eventType, handler)`

Alias for `on()` function.

### `Webhook_client`

Client for managing Twitch EventSub subscriptions.

**Constructor:**
```typescript
new Webhook_client(
  clientId: string,
  token: string,
  callback: string,
  secret: string
)
```

**Methods:**

#### `subscribe(event, condition)`

Subscribe to a Twitch event.

```typescript
await client.subscribe('channel.subscribe', {
  broadcaster_user_id: '123456789'
});
```

#### `unsubscribe(subscription_id)`

Unsubscribe from an event.

```typescript
await client.unsubscribe('subscription-id-here');
```

#### `get_subscriptions(filter?, value?)`

Get current subscriptions.

```typescript
// Get all subscriptions
await client.get_subscriptions();

// Filter by status
await client.get_subscriptions('status', 'enabled');

// Filter by type
await client.get_subscriptions('type', 'channel.subscribe');
```

## Event Types

### `channel.subscribe`

Triggered when a user subscribes to a channel.

**Condition:**
```typescript
{
  broadcaster_user_id: string;
}
```

**Event Data:**
```typescript
{
  user_id: string;
  user_login: string;
  user_name: string;
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  tier: string;
  is_gift: boolean;
}
```

### `channel.follow`

Triggered when a user follows a channel.

**Condition:**
```typescript
{
  broadcaster_user_id: string;
  moderator_user_id: string;
}
```

### `channel.chat.message`

Triggered when a chat message is sent.

**Condition:**
```typescript
{
  broadcaster_user_id: string;
  user_id?: string; // Optional: filter by user
}
```

### `channel.channel_points_custom_reward_redemption.add`

Triggered when a channel point reward is redeemed.

**Condition:**
```typescript
{
  broadcaster_user_id: string;
  reward_id?: string; // Optional: filter by reward
}
```

## Environment Variables

```bash
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
TWITCH_ACCESS_TOKEN=your_access_token
```

## Security

- All webhook requests are automatically verified using HMAC-SHA256 signature validation
- Uses timing-safe comparison to prevent timing attacks
- Invalid signatures return 401 Unauthorized

## Requirements

- Bun runtime
- TypeScript 5+
- Twitch Developer Account with EventSub access

## License

MIT
