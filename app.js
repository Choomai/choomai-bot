const fs = require("node:fs");
const path = require("node:path");
if (process.env.NODE_ENV != "production") require("dotenv").config({ override: true })
const Queue = require("bull");
const mysql = require("mysql2/promise");
const { Client, Collection, Events, GatewayIntentBits, EmbedBuilder, Partials, MessageFlags, PermissionFlagsBits } = require("discord.js");
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
    path: process.env.REDIS_SOCKET
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
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Channel]
});
client.cooldowns = new Collection();

const guildslogChannel = {}, verifyAttempts = {}, voiceChannels = [], memberVCStates = {};
const passing_obj = { verifyAttempts, db, afkQueue, afkNotify, voiceChannels, logChannels: guildslogChannel };

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
    (await getLogChannel(client, member.guild.id, passing_obj))?.send(`${member} has joined the server. Please verify.`);
})

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    if (newState.member.permissions.has(PermissionFlagsBits.ManageChannels)) return;
    if ((oldState.channelId !== null) === (newState.channelId !== null)) return; // Sanity check I guess, XOR btw

    if (!oldState.channelId && newState.channelId) return memberVCStates[newState.member.id] = { channelId: newState.channelId , joined: true, timestamp: Date.now() };

    if (!memberVCStates[newState.member.id]?.joined) return;

    const timePassed = Date.now() - memberVCStates[newState.member.id].timestamp;
    if (timePassed > 5000) return delete memberVCStates[newState.member.id];

    const logChannel = await getLogChannel(client, newState.guild.id, passing_obj);

    try {
        await newState.member.timeout(10 * 60 * 1000, "Join & leave VC too fast");
        const mutedLog = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTimestamp()
            .setAuthor({ name: `Muted [Auto] | ${newState.member.user.username}`, iconURL: newState.member.user.displayAvatarURL() })
            .addFields(
                { name: "User", value: newState.member.toString(), inline: true },
                { name: "Moderator", value: newState.client.user.toString(), inline: true },
                { name: "Length", value: "10 minutes", inline: true },
                { name: "Reason", value: "Join & leave VC in a short timespan" }
            );
        logChannel?.send({ embeds: [mutedLog] })
            .catch(err => console.error("Failed to send message to the log channel", err));

        newState.member.send("You have been muted for 10 minutes due to joining and leaving voice chat too quickly.")
            .catch(err => console.error("Failed to send DM, user might disabled it.", err));
    } catch (err) {console.error(err)}
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

    const logChannel = await getLogChannel(client, interaction.guildId, passing_obj);

    try {await command.execute(interaction, passing_obj)}
    catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        };
    };
    

    const embedLog = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTimestamp()
        .setTitle("Command Logging")
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
            {name: "Issuer", value: interaction.user.toString(), inline: true},
            {name: "Command", value: `\`/${interaction.commandName}\``, inline: true}
        );
    logChannel?.send({ embeds: [embedLog] }).catch(err => console.error("Failed to send message to the log channel", err));
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