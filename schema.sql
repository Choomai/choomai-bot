CREATE TABLE IF NOT EXISTS `log_channels` (
    `guild_id` varchar(32) NOT NULL,
    `channel_id` varchar(32) NOT NULL,
    PRIMARY KEY (`guild_id`),
    UNIQUE KEY `channel_id_UNIQUE` (`channel_id`)
);
