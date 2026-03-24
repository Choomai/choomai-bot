const { Client, TextChannel, User, EmbedBuilder } = require("discord.js");
const { formatTime } = require("./time.js");
const logChannels = {};

/** 
 * Query the log channel from guildId
 * Look at the cached logChannels, if not found then search it in the DB.
 * If neither is found, return null
 * @param {Client} client
 * @param {string} guildId 
 * @returns {Promise<TextChannel|null>}
 */
async function getLogChannel(client, guildId) {
    if (logChannels[guildId]) return logChannels[guildId];

    const [log_channels_query] = await client.db.query("SELECT guild_id, channel_id FROM log_channels WHERE guild_id = ?", [guildId]);
    if (log_channels_query.length <= 0) return null;
    
    const channel = await client.channels.fetch(log_channels_query[0].channel_id);
    if (!channel?.isTextBased()) {
        console.error(`Invalid log channel type for guild ${guildId}`);
        return null;
    }
    logChannels[guildId] = channel;
    return channel;
}

/**
 * Logs a command execution to the log channel
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
    commandLog, autoMuteLog, getLogChannel
};
