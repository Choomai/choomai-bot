const { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, ChannelType, MessageFlags, VoiceChannel } = require("discord.js");

/**
 * @param {CommandInteraction} interaction
 */
async function execute(interaction) {
    /** @type {VoiceChannel} */
    const fromChannel = interaction.options.getChannel("from");
    /** @type {VoiceChannel} */
    const toChannel = interaction.options.getChannel("to");
    if (fromChannel.type !== ChannelType.GuildVoice || toChannel.type !== ChannelType.GuildVoice)
        return void interaction.reply({ content: "You can only move members between voice channels.", flags: MessageFlags.Ephemeral });
    if (fromChannel === toChannel) 
        return void interaction.reply({ content: "You cannot move everyone to the same channel!", flags: MessageFlags.Ephemeral });

    const membersToMove = fromChannel.members;
    if (membersToMove.size === 0) 
        return void interaction.reply({ content: "The specified channel is empty.", flags: MessageFlags.Ephemeral });

    interaction.reply(`Starting to move everyone from ${fromChannel} to ${toChannel}`);
    for (const member of membersToMove) {
        void member[1].voice.setChannel(toChannel);
    }
}

module.exports = {
    cooldown: 30000,
    data: new SlashCommandBuilder()
        .setName("mvall")
        .setDescription("Move everyone from one voice channel to another")
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addChannelOption(option => option
            .setName("from")
            .setDescription("The voice channel to move everyone from")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildVoice)
        )
        .addChannelOption(option => option
            .setName("to")
            .setDescription("The voice channel to move everyone to")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildVoice)
        ),
    execute
}