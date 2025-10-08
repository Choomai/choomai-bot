const { SlashCommandBuilder, SlashCommandSubcommandBuilder, MessageFlags } = require("discord.js");
const { parseTime, formatTime } = require("../include/time.js");

async function execute(interaction, options) {
    const { db, afkQueue, afkNotify } = options;
    let rows, response, jobs, interval;
    switch (interaction.options.getSubcommand()) {
        case "set":
            let time = parseTime(interaction.options.getString("time"));
            interval = parseTime(interaction.options.getString("interval")) ?? 0;
            if (interval && interval < 3600) return await interaction.reply({ content: "Interval must be longer than 1 hour!", flags: MessageFlags.Ephemeral });
            let end_time = Date.now() + time;
            await db.execute(`
            INSERT INTO afk_list (user_id, end_time, afk_time, username) 
            VALUES (?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE end_time = VALUES(end_time), username = VALUES(username), afk_time = VALUES(afk_time)
            `, [interaction.user.id, end_time, time, interaction.user.username]);

            jobs = (await afkQueue.getJobs()).filter(j => j.data.userId == interaction.user.id);
            jobs.forEach(job => job.remove());
            if (interval) afkNotify.add(
                { userId: interaction.user.id },
                { 
                    repeat: { 
                        every: interval,
                        limit: (time / interval).toFixed()
                    }
                }
            );
            await afkQueue.add({ userId: interaction.user.id }, { delay: time })

            await interaction.reply(`You are now AFK for ${formatTime(time)}.`);
            break;

        case "interval":
            interval = parseTime(interaction.options.getString("time"));
            if (interval < 108000) return await interaction.reply({ content: "Interval must be longer than 30 minutes!", flags: MessageFlags.Ephemeral });

            [rows] = await db.execute(`SELECT afk_time FROM afk_list WHERE user_id = ?`, [interaction.user.id]);
            if (rows.length == 0) return await interaction.reply({ content: "You must set an AFK timer first!", flags: MessageFlags.Ephemeral });

            let notify_jobs = (await afkNotify.getJobs()).filter(j => j.data.userId == interaction.user.id);
            notify_jobs.forEach(j => j.remove())
            
            await afkNotify.add(
                { userId: interaction.user.id },
                { 
                    repeat: { 
                        every: interval,
                        limit: (rows[0].afk_time / interval).toFixed()
                    }
                }
            );

            await interaction.reply(`Your AFK timer notify interval is set for ${formatTime(interval)}.`);
            break;

        case "check":
            const user = interaction.options.getUser("user") ?? interaction.user;
            [rows] = await db.execute("SELECT end_time FROM afk_list WHERE user_id = ?", [user.id]);
            if (rows.length <= 0) return await interaction.reply(`${user.username} doesn't have an AFK status or has expired.`);
            
            const timeLeft = Math.round(rows[0].end_time - Date.now());

            if (timeLeft <= 0) {
                await db.execute("DELETE FROM afk_list WHERE user_id = ?", [user.id]);
                await interaction.reply(`${user.username}'s AFK status has expired.`);
            } else await interaction.reply(`${user.username} has ${formatTime(timeLeft)} left.`);
            break;

        case "clear":
            (await afkQueue.getJobs()).filter(j => j.data.userId == interaction.user.id).forEach(j => j.remove());
            (await afkNotify.getJobs()).filter(j => j.data.userId == interaction.user.id).forEach(j => j.remove());
            await db.execute("DELETE FROM afk_list WHERE user_id = ?", [interaction.user.id]);
            await interaction.reply(`AFK status cleared!`);
            break;

        case "leaderboard":
            [rows] = await db.execute("SELECT end_time, username FROM afk_list ORDER BY end_time DESC LIMIT 10");
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