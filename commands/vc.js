// TODO: Add subcommand to change visibilty

const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, PermissionsBitField, ChannelType, SlashCommandSubcommandBuilder, CommandInteraction, GuildMember } = require("discord.js");

/** @type {Array<{ id: string, owner: GuildMember, hidden: boolean, interval: NodeJS.Timeout }>} */
const voiceChannels = [];

/**
 * @param {CommandInteraction} interaction 
 * @param {Object} options
 * @returns {void}
 */
async function execute(interaction) {
    let hidden, targetUser, selectedChannel;

    switch (interaction.options.getSubcommand()) {
        case "new":
            hidden = interaction.options.getBoolean("hidden") ?? true;
            await interaction.deferReply({ flags: hidden ? MessageFlags.Ephemeral : undefined });

            targetUser = interaction.options.getUser("user");
            targetCategory = interaction.options.getChannel("category");
            if (targetCategory && targetCategory.type !== ChannelType.GuildCategory)
                return void interaction.editReply({ message: "Invalid channel category!", flags: MessageFlags.Ephemeral });

            const channel = await interaction.guild.channels.create({
                name: `${interaction.user.username}'s VC`,
                type: ChannelType.GuildVoice,
                parent: targetCategory ?? undefined,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [hidden ? PermissionsBitField.Flags.ViewChannel : PermissionsBitField.Flags.Connect],
                    },
                    {
                        id: interaction.client.user.id,
                        allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels],
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels],
                    },
                    {
                        id: targetUser.id,
                        allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ViewChannel],
                    }
                ]
            });
            await interaction.editReply(`Private voice channel created!${hidden ? " (Hidden from channel list)" : ""}`);
            const interval = setInterval(() => {
                if (channel?.members.size === 0) {
                    clearInterval(interval);
                    channel.delete();
                    voiceChannels = voiceChannels.filter(ch => ch.id !== channel.id);
                }
            }, 5 * 60 * 1000);
            voiceChannels.push({
                id: channel.id, owner: interaction.member, hidden, interval
            });
            break;
    
        case "add":
            targetUser = interaction.options.getUser("user");
            selectedChannel = voiceChannels.find(channel => channel.owner === interaction.member);
            if (!selectedChannel) return void interaction.reply({ content: "VC not found, please create one first.", flags: MessageFlags.Ephemeral });
            selectedChannel = await interaction.client.channels.fetch(selectedChannel.id);

            selectedChannel.permissionOverwrites.create(targetUser, {
                Connect: true,
                ViewChannel: true
            });
            hidden = voiceChannels.find(channel => channel.id == selectedChannel.id).hidden;
            await interaction.reply({ content: `Allowed ${targetUser} to the VC`, flags: hidden ? MessageFlags.Ephemeral : undefined })
            break;

        case "remove":
            targetUser = interaction.options.getUser("user");
            selectedChannel = voiceChannels.find(channel => channel.owner === interaction.member);
            selectedChannel = await interaction.client.channels.fetch(selectedChannel.id);
            if (!selectedChannel) return void interaction.reply({ content: "VC not found, please create one first.", flags: MessageFlags.Ephemeral });

            if (!selectedChannel.permissionOverwrites.delete(targetUser))
                return void interaction.reply({ content: `${targetUser} have not been allowed to the VC or an error occurred.`, flags: MessageFlags.Ephemeral });

            hidden = voiceChannels.find(channel => channel.id == selectedChannel.id).hidden;
            await interaction.reply({ content: `Disallowed ${targetUser} from the VC`, flags: hidden ? MessageFlags.Ephemeral : undefined })
            break;

        case "purge":
            if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels))
                return void interaction.reply({ content: "You do not have permission to use this command.", flags: MessageFlags.Ephemeral });
            await interaction.deferReply();

            let removedCounter = 0;
            for (let i = voiceChannels.length - 1; i >= 0; i--) {
                const voiceChannel = await interaction.guild.channels.fetch(voiceChannels[i].id);
                if (voiceChannel?.members.size !== 0) continue;
                voiceChannel.delete();
                voiceChannels.splice(i, 1);
                await interaction.editReply(`Removed ${++removedCounter} empty private VC.`);
            }
            if (removedCounter === 0) return await interaction.editReply("Can't find any empty private VC to be deleted.");
            break;
    }
}

module.exports = {
    cooldown: 1000,
    data: new SlashCommandBuilder()
        .setName("vc")
        .setDescription("Create/edit private VC")
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName("new")
            .setDescription("Create a new private VC")
            .addUserOption(option => option
                .setName("user")
                .setDescription("Set the user that are allow to join the private VC")
                .setRequired(true)
            )
            .addChannelOption(option => option
                .setName("category")
                .setDescription("What category to put the VC in")
                .setRequired(false)
            )
            .addBooleanOption(option => option
                .setName("hidden")
                .setDescription("Hide the VC from channel list or just show it with locked icon")
                .setRequired(false)
            )
        )
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName("add")
            .setDescription("Allow another user to the VC")
            .addUserOption(option => option
                .setName("user")
                .setDescription("Set the user that are allow to join the private VC")
                .setRequired(true)
            )
        )
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName("remove")
            .setDescription("Remove previously allowed user from VC")
            .addUserOption(option => option
                .setName("user")
                .setDescription("Set the user that aren't allow to join the private VC")
                .setRequired(true)
            )
        )
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName("purge")
            .setDescription("Remove all unused VC that users created")
        ),
    execute
};