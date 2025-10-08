const { SlashCommandBuilder, ChannelType, MessageFlags, PermissionFlagsBits } = require("discord.js");

async function execute(interaction, options) {
    const { db, logChannels } = options;
    let channel = interaction.options.getChannel("channel");
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) return await interaction.reply({ content: "You do not have permission to use this command.", flags: MessageFlags.Ephemeral });

    // Put the channel into cache
    await interaction.guild.channels.fetch(channel.id, { force: true });
    await db.execute(
        `INSERT INTO log_channels (guild_id, channel_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE channel_id = VALUES(channel_id)`,
        [interaction.guildId, channel.id]
    );
    logChannels[interaction.guildId] = channel;

    await interaction.reply(`Successfully set the log channel to ${channel}.`);
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