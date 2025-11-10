export type Conditions = {
    "channel.channel_points_custom_reward_redemption.add": {
        broadcaster_user_id: string;
        reward_id?: string;
    },
    "channel.follow": {
        broadcaster_user_id: string;
        moderator_user_id: string;
    },
    "channel.subscribe": {
        broadcaster_user_id: string;
    },
    "channel.chat.message": {
        broadcaster_user_id: string;
        user_id: string;
    }
};