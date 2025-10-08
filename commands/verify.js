const { SlashCommandBuilder, MessageFlags } = require("discord.js");

async function execute(interaction, verifyAttempts) {
    const guildMember = interaction.guild.members.cache.get(interaction.user.id);

    if (guildMember.roles.cache.has(process.env.DCG_MEMBER_ID))
        return await interaction.reply({ content: "You have already been verified!", flags: MessageFlags.Ephemeral });

    if (verifyAttempts[interaction.user.id] >= 3)
        return await interaction.reply({ content: "You have reached the maximum number of attempts. Please try again in 6 hours.", flags: MessageFlags.Ephemeral });

    let num1, num2, problem, answer, operation = Math.floor(Math.random() * 4);
    switch(operation) {
        case 0: // addition
            num1 = Math.floor(Math.random() * 101);
            num2 = Math.floor(Math.random() * 101);
            problem = `${num1} + ${num2}`;
            answer = num1 + num2;
            break;
        case 1: // subtraction
            num1 = Math.floor(Math.random() * 101);
            num2 = Math.floor(Math.random() * num1);
            problem = `${num1} - ${num2}`;
            answer = num1 - num2;
            break;
        case 2: // multiplication
            num1 = Math.floor(Math.random() * 10);
            num2 = Math.floor(Math.random() * 10);
            problem = `${num1} * ${num2}`;
            answer = num1 * num2;
            break;
        case 3: // division
            num2 = Math.floor(Math.random() * 10) + 1;
            num1 = num2 * (Math.floor(Math.random() * 10) + 1);
            problem = `${num1} / ${num2}`;
            answer = num1 / num2;
            break;
    };

    const dmChannel = await interaction.user.createDM();
    const collector = dmChannel.createMessageCollector({
        filter: msg => msg.author.id == interaction.user.id, 
        time: 30000
    });

    await interaction.reply({ content: "Check your DM.", flags: MessageFlags.Ephemeral });
    await interaction.user.send(`You have 30s to solve this problem: ${problem}`);
    
    collector.on("collect", msg => {
        if (parseInt(msg.content) == answer) {
            guildMember.roles.add(process.env.DCG_MEMBER_ID);
            guildMember.roles.remove(process.env.DCG_INACTIVE_ID);
            interaction.user.send("You have been verified!");
            return collector.stop();
        } else {
            if (!verifyAttempts[interaction.user.id]) verifyAttempts[interaction.user.id] = 0;
            if (++verifyAttempts[interaction.user.id] >= 3) return collector.stop();
            return interaction.user.send("Incorrect answer. Please try again.");
        }
    });

    collector.on("end", collected => {
        if (collected.size == 0 || verifyAttempts[interaction.user.id] >= 3) {
            interaction.user.send("Time is up! You failed.\nYou have reached the maximum number of attempts. Please try again in 6 hours.");
            setTimeout(() => {delete verifyAttempts[interaction.user.id]}, 21600000);
        };
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("verify")
        .setDescription("Who are you ?"),
    execute
};