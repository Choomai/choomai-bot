# TODO - Discord Bot Improvements

## Bugs & Improvements

### VC Anti-spam is Too Aggressive
- **Issue**: Currently mutes anyone joining/leaving voice under 5 seconds
- **Problem**: Legitimate accidental disconnects could trigger this
- **Suggestions**:
  - Exempt certain roles (mods, admins, bots)
  - Add warning before mute
  - Adjust threshold timing
- **File**: [app.js](app.js#L85-L95)

### Missing Args Handling
- **Issue**: Message commands can't parse arguments properly
- **File**: [app.js](app.js#L124)
- **Status**: Has TODO comment in code
- **Details**: Need to parse message content for command arguments (currently only gets command name)

### Generic Error Messages
- **Issue**: "There was an error while executing this command!" doesn't help debugging
- **Problem**: Errors aren't logged to logging channel with details
- **Suggestion**: Log full error stack traces to the logging channel
- **Files**: [app.js](app.js#L118-L120), [app.js](app.js#L130-L132)

### Incomplete README Documentation
- **Issue**: README only documents some commands
- **Missing**: `mvall`, `ping`, `vc` commands
- **File**: [README.md](README.md)

### Missing Database Schema
- **Issue**: Only has `log_channels` table
- **File**: [schema.sql](schema.sql)
- **Suggestions**: Add tables for:
  - User statistics
  - Moderation history (warnings, mutes, bans)
  - Leaderboards (separate from Redis)
  - Server-specific settings/preferences

---

## Code Quality

### Inconsistent JSDoc Comments
- **Issue**: Some commands have detailed JSDoc, others don't
- **Suggestion**: Add consistent JSDoc to all command files
- **Example**: [verify.js](commands/verify.js) has good JSDoc, but others are missing

### Repeated Cooldown Logic
- **Issue**: Cooldown checking is duplicated in InteractionCreate and MessageCreate handlers
- **File**: [app.js](app.js#L112), [app.js](app.js#L126)
- **Suggestion**: Extract into a helper function

### Rate Limiting is Simplistic
- **Current**: Basic per-command per-user cooldown
- **Issue**: No guild-level, channel-level, or burst protection
- **Suggestion**: Enhance cooldown system to be more flexible
- **File**: [include/cooldown.js](include/cooldown.js)

### Missing Environment Variable Validation
- **Issue**: `.env` variables aren't validated on startup
- **Tool Available**: `zod` is already in dependencies
- **Suggestion**: Add validation schema at app startup
- **File**: [app.js](app.js) (top of file)

### Extract Common Patterns
- **Identified Patterns**:
  - Error reply patterns (ephemeral, error message)
  - TTL formatting (using `formatTime()`)
  - Database/Redis queries
- **Suggestion**: Create helper utilities to reduce duplication

### Error Response Consistency
- **Issue**: Some commands use `MessageFlags.Ephemeral`, others don't
- **Suggestion**: Standardize error response patterns across all commands
- **Files**: All command files

---

## Testing

### No Test Suite
- **Issue**: `package.json` has empty test script
- **Suggestion**: Add unit tests for:
  - `include/time.js` (parseTime, formatTime)
  - `include/cooldown.js` (isOnCooldown logic)
  - `include/bytes.js` (formatBytes)
- **Tool**: Consider Jest or Vitest
