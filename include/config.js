const zod = require("zod");
if (process.env.NODE_ENV != "production") require("@dotenvx/dotenvx").config();

const envSchema = zod.object({
    // Discord
    TOKEN: zod.string(),
    CLIENT_ID: zod.string().regex(/^\d+$/, "Invalid client ID"),
    SERVER_ID: zod.string().regex(/^\d+$/, "Invalid server ID"),
    SERVER_MEMBER_ID: zod.string().regex(/^\d+$/, "Invalid role ID"),
    
    // Database
    DB_HOST: zod.union([ zod.ipv4(), zod.ipv6(), zod.hostname() ]).default("127.0.0.1"),
    DB_SOCKET: zod.string().optional(),
    DB_USER: zod.string(),
    DB_PASSWORD: zod.string(),
    DB_NAME: zod.string(),
    
    // Redis
    REDIS_HOST: zod.union([ zod.ipv4(), zod.ipv6(), zod.hostname() ]).optional().default("127.0.0.1"),
    REDIS_SOCKET: zod.string().optional(),
    
    // Server
    PORT: zod.coerce.number().int().positive().default(16969),
    SOCKET_PATH: zod.string().optional(),
    SOCKET_MODE: zod.string().default("0775"),
    
    // Web/Verification
    DOMAIN: zod.hostname(),
    TURNSTILE_SITE_KEY: zod.string(),
    TURNSTILE_SECRET_KEY: zod.string()
});

// Validate on startup
const result = envSchema.safeParse(process.env);

if (!result.success) {
    console.error("Environment validation failed:");
    result.error?.issues.forEach(err => {
        const field = err.path.join("");
        console.error(`${field} - ${err.message}`);
    });
    process.exit(1);
}