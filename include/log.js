const { Client, TextChannel, User, EmbedBuilder, ChannelType } = require("discord.js");
const { formatTime } = require("./time.js");
const Redis = require("ioredis");
const { Pool } = require("mysql2/promise");

/** 
 * Query the log channel from guildId
 * Look at the cached logChannels, if not found then search it in the DB.
 * If neither is found, return null
 * @param {Client} client
 * @param {Redis} client.redis
 * @param {Pool} client.db
 * @param {string} guildId
 * @returns {Promise<TextChannel|null>}
 */
async function getLogChannel(client, guildId) {
    let logChannelId = await client.redis.get("choomai_bot:log_channel:" + guildId);
    if (!logChannelId) {
        const [log_channels_query] = await client.db.query("SELECT guild_id, channel_id FROM log_channels WHERE guild_id = ?", [guildId]);
        if (log_channels_query.length <= 0) return null;
        console.log(`Cache miss for log channel of guild ${guildId}, caching it now.`);
        await client.redis.setex("choomai_bot:log_channel:" + guildId, 6 * 60 * 60, log_channels_query[0].channel_id);
        logChannelId = log_channels_query[0].channel_id;
    }
    
    const channel = await client.channels.fetch(logChannelId);
    if (channel.type !== ChannelType.GuildText) {
        console.error(`Invalid log channel type for guild ${guildId}`);
        client.redis.del("choomai_bot:log_channel:" + guildId);
        return null;
    }
    return channel;
}

/**
 * Log a simple text message to the log channel
 * @param {Client} client 
 * @param {string} guildId 
 * @param {string} message 
 * @returns {Promise<void>}
 */
async function simpleLog(client, guildId, message) {
    const channel = await getLogChannel(client, guildId);
    if (!channel) return;
    channel.send({ content: message, allowedMentions: { repliedUser: false } })
        .catch(err => console.error("Failed to send log message to the log channel", err));
}

/**
 * Log a command execution to the log channel
 * @param {Client} client 
 * @param {string} guildId 
 * @param {User} issuer 
 * @param {string} commandName 
 * @returns {Promise<void>}
 */
async function commandLog(client, guildId, issuer, commandName) {
    const channel = await getLogChannel(client, guildId);
    if (!channel) return;

    const embedLog = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTimestamp()
        .setTitle("Command Logging")
        .setThumbnail(issuer.displayAvatarURL())
        .addFields(
            {name: "Issuer", value: issuer.toString(), inline: true},
            {name: "Command", value: `\`/${commandName}\``, inline: true}
        );
    channel.send({ embeds: [embedLog] }).catch(err => console.error("Failed to send command log to the log channel", err));
}

/**
 * Log the auto mute action to the log channel
 * @param {Client} client 
 * @param {string} guildId 
 * @param {User} user 
 * @param {number} duration Duration in milliseconds
 * @param {string} reason 
 * @returns {Promise<void>}
 */
async function autoMuteLog(client, guildId, user, duration, reason) {
    const channel = await getLogChannel(client, guildId);
    if (!channel) return;

    const mutedLog = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTimestamp()
        .setAuthor({ name: `Muted [Auto] | ${user.username}`, iconURL: user.displayAvatarURL() })
        .addFields(
            { name: "User", value: user.toString(), inline: true },
            { name: "Moderator", value: client.user.toString(), inline: true },
            { name: "Length", value: formatTime(duration), inline: true },
            { name: "Reason", value: reason }
        );
    channel.send({ embeds: [mutedLog] }).catch(err => console.error("Failed to send mute log to the log channel", err));
}

module.exports = {
    simpleLog, commandLog, autoMuteLog, getLogChannel
};
