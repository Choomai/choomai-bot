CREATE TABLE IF EXISTS `afk_list` (
    `user_id` varchar(255) NOT NULL,
    `end_time` bigint NOT NULL,
    `afk_time` bigint NOT NULL,
    `username` varchar(255) NOT NULL,
    PRIMARY KEY (`user_id`)
);

CREATE TABLE IF EXISTS `log_channels` (
    `guild_id` varchar(32) NOT NULL,
    `channel_id` varchar(32) NOT NULL,
    PRIMARY KEY (`guild_id`),
    UNIQUE KEY `channel_id_UNIQUE` (`channel_id`)
);
