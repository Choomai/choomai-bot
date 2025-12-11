const fs = require("node:fs");
const path = require("node:path");
if (process.env.NODE_ENV != "production") require("dotenv").config()
const Queue = require("bull");
const mysql = require("mysql2/promise");
const { Client, Collection, Events, GatewayIntentBits, EmbedBuilder, Partials, MessageFlags } = require("discord.js");
// const express = require("express");

const { formatTime } = require("./include/time.js");
const { getLogChannel } = require("./include/get-log-channel.js");

const db = mysql.createPool({
    host: process.env.DB_HOST,
    socketPath: process.env.DB_SOCKET,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: "Discord"
});


const redis_conf = {
    host: process.env.REDIS_HOST,
    path: process.env.REDIS_SOCKET,
    password: process.env.REDIS_PASSWORD
}
const afkQueue = new Queue("afkQueue", {redis: redis_conf});
const afkNotify = new Queue("afkNotify", {redis: redis_conf});
afkQueue.process(async (job, done) => {
    const { userId } = job.data;
    let [rows] = await db.execute("SELECT end_time FROM afk_list WHERE user_id = ?", [userId]);
    if (rows.length <= 0) {done(); return};

    const user = await client.users.fetch(userId);
    if (rows[0].end_time <= Date.now()) {
        await db.execute("DELETE FROM afk_list WHERE user_id = ?", [userId]);
        await user.send("Your AFK status has expired.");
    };
    let notify_jobs = (await afkNotify.getJobs()).filter(j => j.data?.userId == userId);
    notify_jobs.forEach(j => j.remove())
    done();
});
afkNotify.process(async (job, done) => {
    const { userId } = job.data;

    let [rows] = await db.execute("SELECT end_time FROM afk_list WHERE user_id = ?", [userId]);
    if (rows.length <= 0) {job.discard(); return done();};

    const user = await client.users.fetch(userId);
    await user.send(`You have ${formatTime(rows[0].end_time - Date.now())} left.`);
    done();
});

// const app = express();
// app.use(express.text());
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});
client.cooldowns = new Collection();

const logChannels = {}, verifyAttempts = {}, voiceChannels = [];
passing_obj = { verifyAttempts, db, afkQueue, afkNotify, voiceChannels, logChannels }

client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands/");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    let filePath = path.join(commandsPath, file);
    let command = require(filePath);
    if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
};



client.on(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}.`);
});

client.on(Events.GuildMemberAdd, async member => {
    getLogChannel(member.guild.id)?.send(`${member} has joined the server. Please verify.`);
})

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.inGuild()) return interaction.reply("Hey! Don't use these commands here; use them on your server.");

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return console.error(`No command matching ${interaction.commandName} was found.`);

    const { cooldowns } = interaction.client;
    let now = Date.now();
    if (!cooldowns.has(interaction.commandName)) cooldowns.set(interaction.commandName, new Collection());
    let timestamps = cooldowns.get(interaction.commandName);
    let cooldownAmount = command.cooldown ?? 3000;
    if (timestamps.has(interaction.user.id)) {
        let expireTime = timestamps.get(interaction.user.id) + cooldownAmount;
        let timeLeft = (expireTime - now) / 1000;
        if (now < expireTime) return await interaction.reply({ content: `Please wait ${timeLeft.toFixed(1)}s before execute this command again.`, flags: MessageFlags.Ephemeral })
        else timestamps.delete(interaction.user.id);
    };
    timestamps.set(interaction.user.id, now);

    try {await command.execute(interaction, passing_obj)}
    catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        };
    };
    

    let embedLog = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTimestamp()
        .setTitle("Command Logging")
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
            {name: "Issuer", value: `${interaction.user}`, inline: true},
            {name: "Command", value: `\`/${interaction.commandName}\``, inline: true}
        );
    getLogChannel(interaction.guildId, logChannels)?.send({ embeds: [embedLog] });
});

// app.put("/status", (req, res) => {
//     const emoji = req.headers["x-tag"];

//     client.user.setPresence({ activities: [{ 
//         name: req.body,
//         type: 4,
//         emoji: {
//             name: emoji,
//             animated: false
//         }
//     }]});
//     res.send("Status set successfully");
// })


// const socketPath = path.join(__dirname, "status.sock");
// if (fs.existsSync(socketPath)) {fs.unlinkSync(socketPath);}
// app.listen(socketPath, () => {
//     fs.chmodSync(socketPath, "775");
//     console.log(`Listening at ${socketPath}`);
// });


client.login(process.env.TOKEN);