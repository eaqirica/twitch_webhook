export type Events = {
    "channel.channel_points_custom_reward_redemption.add": {
        id: string;
        broadcaster_user_id: string;
        broadcaster_user_login: string;
        broadcaster_user_name: string;
        user_id: string;
        user_login: string;
        user_name: string;
        user_input: string;
        status: string;
        reward: {
            id: string;
            title: string;
            cost: number;
            prompt: string;
        };
        redeemed_at: Date;
    },
    "channel.follow": {
        user_id: string;
        user_login: string;
        user_name: string;
        broadcaster_user_id: string;
        broadcaster_user_login: string;
        broadcaster_user_name: string;
        followed_at: Date;
    },
    "channel.subscribe": {
        user_id: string;
        user_login: string;
        user_name: string;
        broadcaster_user_id: string;
        broadcaster_user_login: string;
        broadcaster_user_name: string;
        tier: string,
        is_gift: boolean
    },
    "channel.chat.message": {
        broadcaster_user_id: string;
        broadcaster_user_login: string;
        broadcaster_user_name: string;
        chatter_user_id: string;
        chatter_user_login: string;
        chatter_user_name: string;
        message_id: string;
        message: {
            text: string;
            fragments: Array<{
                type: string;
                text: string;
                cheermote: null | any;
                emote: null | any;
                mention: null | any;
            }>;
        };
        color: string;
        badges: Array<{
            set_id: string;
            id: string;
            info: string;
        }>;
        message_type: string;
        cheer: null | any;
        reply: null | any;
        channel_points_custom_reward_id: null | string;
        source_broadcaster_user_id: null | string;
        source_broadcaster_user_login: null | string;
        source_broadcaster_user_name: null | string;
        source_message_id: null | string;
        source_badges: null | any;
    }
}