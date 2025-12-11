const { Client, TextChannel } = require("discord.js");

/** 
 * Query the log channel from guildId
 * Look at the cached logChannels, if not found then search it in the DB
 * If neither is found, return null
 * @param {Client} client
 * @param {string} guildId 
 * @param {Array} cachedLogChannels
 * @returns {TextChannel|null}
 */
async function getLogChannel(client, guildId, cachedLogChannels) {
    if (cachedLogChannels[guildId]) return cachedLogChannels[guildId];

    const [log_channels_query] = await db.query("SELECT guild_id, channel_id FROM log_channels WHERE guild_id = ?", [guildId]);
    if (log_channels_query.length <= 0) return null;
    
    const channel = await client.channels.fetch(log_channels_query[0].channel_id);
    if (!channel?.isTextBased()) return console.error(`Invalid log channel type for guild ${interaction.guildId}`);
    cachedLogChannels[interaction.guildId] = channel;

    return channel;
}

module.exports = {
    getLogChannel
};
