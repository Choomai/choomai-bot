const { Client, TextChannel } = require("discord.js");
const { PoolConnection } = require("mysql2/promise");

/** 
 * Query the log channel from guildId
 * Look at the cached logChannels, if not found then search it in the DB.
 * If neither is found, return null
 * @param {Client} client
 * @param {string} guildId 
 * @param {Object<PoolConnection, Record<string, TextChannel>>} options
 * @returns {Promise<TextChannel|null>}
 */
async function getLogChannel(client, guildId, options) {
    const { db, logChannels } = options;
    if (logChannels[guildId]) return logChannels[guildId];

    const [log_channels_query] = await db.query("SELECT guild_id, channel_id FROM log_channels WHERE guild_id = ?", [guildId]);
    if (log_channels_query.length <= 0) return null;
    
    const channel = await client.channels.fetch(log_channels_query[0].channel_id);
    if (!channel?.isTextBased()) {
        console.error(`Invalid log channel type for guild ${guildId}`);
        return null;
    }
    logChannels[guildId] = channel;

    return channel;
}

module.exports = {
    getLogChannel
};
