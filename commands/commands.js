import { SlashCommandBuilder } from "discord.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Load all command modules from the current directory, excluding this file.
 * @returns {Promise<Array<{data: SlashCommandBuilder, execute: Function, cooldown?: number}>>}
 */
export default async function loadCommands() {
    const commands = [];
    const files = fs.readdirSync(__dirname).filter(f => f.endsWith(".js") && f !== "commands.js");

    await Promise.all(
        files.map(async file => {
            const filePath = path.join(__dirname, file);
            // pathToFileURL ensures Windows paths don't break ESM imports
            const command = await import(pathToFileURL(filePath).href);
            if ("data" in command && "execute" in command) commands.push(command);
            else console.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
        })
    );

    return commands;
}