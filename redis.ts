import { createClient } from 'redis';

import type { IDatabase } from "./types";

export const getDB = async () => {
    const redisClient = createClient({
        url: process.env.REDIS_URL,
        password: process.env.REDIS_PASSWORD
    });
    await redisClient.connect();

    const db: IDatabase = {
        set: async row => {
            await redisClient.sAdd('chats', row.chat_id.toString());
        },

        disconnect: async () => await redisClient.disconnect()
    };

    return db;
};
