# Choomai Bot

<!-- README generated with Claude (Anthropic) -->

A Discord bot built with [discord.js](https://discord.js.org/).

## Requirements

- Node.js >= 20
- MySQL 8
- Redis

## Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/Choomai/choomai-bot
cd choomai-bot
npm install --omit=dev
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
TOKEN=your_discord_bot_token
CLIENT_ID=your_application_client_id
SERVER_ID=your_guild_id

DB_HOST=127.0.0.1        # or leave unset to use DB_SOCKET
DB_SOCKET=/run/mysqld/mysqld.sock
DB_USER=root
DB_PASSWORD=your_db_password
DB_NAME=Discord

REDIS_HOST=127.0.0.1     # or leave unset to use REDIS_SOCKET
REDIS_SOCKET=/var/run/redis/redis.sock
```

### 3. Initialize the database

```bash
mysql -u root -p Discord < schema.sql
```

### 4. Register slash commands

```bash
npm run sync
```

### 5. Start the bot

```bash
node app.js
```

---

## Docker

A `docker-compose.yaml` is provided that bundles the bot, MySQL 8, and Redis together.

```bash
# Create a .env file with at minimum:
# DB_PASSWORD=your_db_password
# TOKEN=your_discord_bot_token
# CLIENT_ID=your_application_client_id
# SERVER_ID=your_guild_id

docker compose up -d
```

A pre-built image is published to the GitHub Container Registry and updated automatically on every version bump at `ghcr.io/choomai/choomai-bot:latest`

---

## Commands

### `/afk`

Manages AFK timers, useful for games like VALORANT where you need to step away for a set duration.

| Subcommand | Description |
|---|---|
| `set <time> [interval]` | Set your AFK timer. `time` and optional `interval` use duration syntax (e.g. `30m`, `2h`, `1d`). |
| `interval <time>` | Update the notification interval on an existing timer. Minimum 30 minutes. |
| `check [user]` | Check how much time a user (or yourself) has left. |
| `clear` | Cancel your AFK timer. |
| `leaderboard` | Show the top 10 users with the longest remaining AFK time. |

When the timer expires, the bot sends you a DM. If an interval is set, it will DM you a reminder at each interval.

---

### `/dcall`

Disconnects everyone from the voice channel you are currently in.

- Requires **Move Members** permission.
- Also available as a message command: `@BotName dcall`
- Has a 30 second cooldown.

---

### `/logging <channel>`

Sets the channel where the bot will log command usage and automatic moderation actions.

- Requires **Manage Server** permission.
- Logs include: command issuer, command name, and auto-mute events.

---

### `/ping`

Replies with `Pong!`. Useful for checking if the bot is alive.

---

### `/status`

Displays the live status of Choomai infrastructure, including:

- CPU load and temperature
- RAM usage
- Network RX/TX
- Docker container count
- Website (nginx), VPN, and Minecraft server reachability

Has a 10 second cooldown.

---

### `/vc`

Creates and manages private voice channels.

| Subcommand | Description |
|---|---|
| `new <user> [category] [hidden]` | Create a private VC for yourself and one other user. `hidden` (default: true) hides it from the channel list entirely; set to false to show it with a locked icon instead. |
| `add <user> <vc>` | Allow an additional user to join an existing private VC. |
| `remove <user> <vc>` | Remove a previously allowed user from a private VC. |
| `purge` | Delete all empty private VCs. Requires **Manage Channels** permission. |

Private VCs are automatically deleted once they have been empty for 5 minutes.

---

### `/wol <ip> <port> <mac>`

Sends a Wake-on-LAN magic packet to a device on your network.

- `ip`: IP address or hostname of the target
- `mac`: MAC address of the target device (e.g. `AA:BB:CC:DD:EE:FF`)
- `port`: UDP port to send the packet to (1–65535)

---

## Auto-moderation

The bot automatically times out members who join and leave a voice channel within 5 seconds, issuing a **10 minute timeout**. Members with the **Manage Channels** permission are exempt. The action is logged to the configured log channel.

<!-- ---

## Development

Install dev dependencies (includes `dotenv` and `commitlint`):

```bash
npm install
```

This project follows [Conventional Commits](https://www.conventionalcommits.org/). Commit messages are linted via `commitlint`.

To sync slash commands to your test server after making changes:

```bash
npm run sync
``` -->