const { SlashCommandBuilder, ChannelType, MessageFlags, PermissionFlagsBits, CommandInteraction } = require("discord.js");

/**
 * @param {CommandInteraction} interaction 
 * @returns {void}
 */
async function execute(interaction) {
    let channel = interaction.options.getChannel("channel");
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild))
        return void interaction.reply({ content: "You do not have permission to use this command.", flags: MessageFlags.Ephemeral });

    if (channel.type !== ChannelType.GuildText)
        return void interaction.reply({ content: "Invalid channel type!", flags: MessageFlags.Ephemeral });

    // Put the channel into cache
    await interaction.guild.channels.fetch(channel.id, { force: true });
    interaction.client.redis.setex("choomai_bot:log_channel:" + interaction.guildId, channel.id, 6 * 60 * 60);
    interaction.client.db.execute(
        `INSERT INTO log_channels (guild_id, channel_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE channel_id = VALUES(channel_id)`,
        [interaction.guildId, channel.id]
    );

    interaction.reply(`Successfully set the log channel to ${channel}.`);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("logging")
        .setDescription("Set the logging channel for who and when a command has been issued.")
        .addChannelOption(option => option
            .setName("channel")
            .setDescription("The channel for the set action")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    execute
}