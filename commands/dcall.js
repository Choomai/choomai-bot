const { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, MessageFlags, Message, VoiceChannel } = require("discord.js");

/**
 * @param {CommandInteraction|Message} interaction
 */
async function execute(interaction) {
    /** @type {VoiceChannel} */
    let channel;
    if (interaction instanceof Message) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.MoveMembers))
            return await interaction.reply("You do not have permission to use this command.");

        channel = interaction.member.voice.channel;
        if (!channel) return await interaction.reply("You are not in a voice channel.");
    } else if (interaction instanceof CommandInteraction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.MoveMembers))
            return await interaction.reply({ content: "You do not have permission to use this command.", flags: MessageFlags.Ephemeral });

        channel = interaction.member.voice.channel;
        if (!channel) return await interaction.reply({ content: "You are not in a voice channel.", flags: MessageFlags.Ephemeral });
    }

    interaction.reply({ content: `Starting to disconnect everyone from ${channel}.`, allowedMentions: { repliedUser: false } });
    for (let member of channel.members) {
        void member[1].voice.disconnect(`Disconnect everyone command issued by ${interaction.user}`);
    }
}

module.exports = {
    cooldown: 30000,
    messageCommand: true,
    data: new SlashCommandBuilder()
        .setName("dcall")
        .setDescription("Disconnect everyone from the voice channel that the invoker is in")
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),
    execute
}