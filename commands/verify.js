const { SlashCommandBuilder, CommandInteraction, MessageFlags, PermissionFlagsBits } = require("discord.js");
const crypto = require("node:crypto");
const { formatTime } = require("../include/time.js");

/**
 * @param {CommandInteraction} interaction 
 */
async function execute(interaction) {
    if (interaction.member.roles.cache.has(process.env.SERVER_MEMBER_ID) || interaction.memberPermissions.has(PermissionFlagsBits.Administrator))
        return void interaction.reply({ content: "You are already verified.", flags: MessageFlags.Ephemeral });

    const attempts = await interaction.client.redis.get(`choomai_bot:verify:${interaction.user.id}:attempts`);
    if (attempts && parseInt(attempts) >= 3) {
        const ttlLeft = await interaction.client.redis.ttl(`choomai_bot:verify:${interaction.user.id}:attempts`);
        return void interaction.reply({
            content: `You have reached the maximum verification attempts. Please try again in ${formatTime(ttlLeft)}.`,
            flags: MessageFlags.Ephemeral
        });
    };

    await interaction.client.redis.incr(`choomai_bot:verify:${interaction.user.id}:attempts`);

    const uuid = crypto.randomUUID();
    await interaction.client.redis.setex(`choomai_bot:verify:${uuid}`, 10 * 60, interaction.user.id);
    await interaction.user.send(`Your verification URL is: https://discord.choomai.net/verify/${uuid}`);
    interaction.reply({ content: "Check your DM for verification URL.", flags: MessageFlags.Ephemeral });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("verify")
        .setDescription("Who are you ?"),
    execute
};