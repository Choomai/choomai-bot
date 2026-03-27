const { SlashCommandBuilder, SlashCommandSubcommandBuilder, MessageFlags, CommandInteraction } = require("discord.js");
const { parseTime, formatTime } = require("../include/time.js");
const { Queue } = require("bullmq");

/**
 * @param {CommandInteraction} interaction 
 * @param {Object} options
 * @param {Queue} options.afkQueue
 * @param {Queue} options.afkNotify
 * @returns {void}
 */
async function execute(interaction, options) {
    const { afkQueue, afkNotify } = options;
    let rows, response, mainJob, notifyJob, interval;
    switch (interaction.options.getSubcommand()) {
        case "set":
            let time = parseTime(interaction.options.getString("time"));
            interval = parseTime(interaction.options.getString("interval")) ?? 0;
            if (interval && interval < 3600) return await interaction.reply({ content: "Interval must be longer than 1 hour!", flags: MessageFlags.Ephemeral });
            let endTime = Date.now() + time;
            
            (await afkQueue.getJob(interaction.user.id))?.remove()
            
            if (interval !== 0) notifyJob = await afkNotify.add("notify", { userId: interaction.user.id, endTime }, { 
                repeat: { 
                    every: interval,
                    limit: (time / interval).toFixed()
                }
            });
            await afkQueue.add(
                "afk",
                { endTime, notifyId: notifyJob?.repeatJobKey },
                { delay: time, jobId: interaction.user.id, removeOnComplete: true, removeOnFail: true }
            );

            interaction.reply(`You are now AFK for ${formatTime(time)}.`);
            break;

        case "interval":
            interval = parseTime(interaction.options.getString("time"));
            if (interval < 30 * 60) return await interaction.reply({ content: "Interval must be longer than 30 minutes!", flags: MessageFlags.Ephemeral });

            mainJob = await afkQueue.getJob(interaction.user.id);
            if (!mainJob) return void interaction.reply({ content: "You must set an AFK timer first!", flags: MessageFlags.Ephemeral });

            if (mainJob.data.notifyId) await afkNotify.removeJobScheduler(mainJob.data.notifyId);
            notifyJob = await afkNotify.add("notify", { userId: interaction.user.id, endTime: mainJob.data.endTime }, { 
                repeat: {
                    every: interval,
                    limit: (mainJob.delay / interval).toFixed()
                },
                jobId: interaction.user.id,
                removeOnComplete: true,
                removeOnFail: true
            });
            await mainJob.updateData({ endTime: mainJob.data.endTime, notifyId: notifyJob.repeatJobKey });
            
            interaction.reply(`Your AFK timer notify interval is set for ${formatTime(interval)}.`);
            break;

        case "check":
            const user = interaction.options.getUser("user") ?? interaction.user;
            mainJob = await afkQueue.getJob(user.id);
            if (!mainJob) return void interaction.reply(`${user.username} doesn't have an AFK status or has expired.`);

            const timeLeft = Math.round(mainJob.data.endTime - Date.now());
            interaction.reply(`${user.username} has ${formatTime(timeLeft)} left.`);
            break;

        case "clear":
            mainJob = await afkQueue.getJob(interaction.user.id);
            if (!mainJob) return void interaction.reply({ content: "You don't have an AFK status or it has expired.", flags: MessageFlags.Ephemeral });

            if (mainJob.data.notifyId) await afkNotify.removeJobScheduler(mainJob.data.notifyId);
            await mainJob.remove();
            interaction.reply(`AFK status cleared!`);
            break;

        case "leaderboard":
            return void interaction.reply("Subcommand disabled!");
            [rows] = await interaction.client.db.execute("SELECT end_time, username FROM afk_list ORDER BY end_time DESC LIMIT 10");
            if (rows.length <= 0) {await interaction.reply("Leaderboard is empty."); break};

            response = "## AFK Leaderboard:\n";
            for (let i = 0; i < rows.length; i++) {
                let timeLeft = Math.round(rows[i].end_time - Date.now());
                response += `${i+1}. ${rows[i].username} - ${formatTime(timeLeft)}\n`;
            };
            await interaction.reply(response);
            break;
    };
};

module.exports = {
    cooldown: 8000,
    data: new SlashCommandBuilder()
        .setName("afk")
        .setDescription("Set the AFK timer for games like VALORANT, and get notify when the timer ran out.")
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName("set")
            .setDescription("Set your AFK status")
            .addStringOption(option => option
                .setName("time")
                .setDescription("Time in duration, like 3m, 1h, 7d")
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("interval")
                .setDescription("Same as time, will notify you how much time you have left for that interval.")
            )
        )
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName("interval")
            .setDescription("Set/change interval to notify how much time you have left.")
            .addStringOption(option => option
                .setName("time")
                .setDescription("Time in duration, like 3m, 1h, 7d")
                .setRequired(true)
            )
        )
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName("check")
            .setDescription("Check a user's AFK status")
            .addUserOption(option => option
                .setName("user")
                .setDescription("The user to check")
            )
        )
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName("clear")
            .setDescription("Clear your AFK status")
        )
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName("leaderboard")
            .setDescription("Get the AFK leaderboard")
        ),
    execute
};