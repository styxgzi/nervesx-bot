// spam-detection.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Client, EmbedBuilder, Message, PermissionsBitField } from 'discord.js';
import { HelperService } from 'lib/classes/Helper';
import { PunishmentService } from 'lib/classes/Punishment';
import { SecurityService } from 'lib/classes/Security';
import { AntiConfig } from 'lib/models/server.schema';
import { ServerLogChannelRepository } from 'lib/repository/server-log-channel.repository';
import { ServerRepository } from 'lib/repository/server.repository';
import { RedisService } from 'lib/services/Redis.service';

@Injectable()
export class SpamDetectionService {
  private readonly logger = new Logger(SpamDetectionService.name);
  private client: Client;

  private config = {
    rateLimit: {
      window: 5, // Time window in seconds
      maxMessages: 10, // Max messages allowed in the time window
    },
    maxWarnings: 3, // Maximum warnings before taking action
  };

  constructor(
    private readonly redisService: RedisService,
    private readonly punishmentService: PunishmentService,
    private readonly serverLogChannelRepository: ServerLogChannelRepository,
    private readonly helperService: HelperService,
    private readonly serverRepository: ServerRepository,
    private readonly securityService: SecurityService,
  ) {}

  async analyzeMessage(message: Message, client: Client): Promise<void> {
    this.client = client;

    // Try to get the anti-spam config from Redis first
    const redisKey = `antiConfig:${message.guildId}`;
    let antiConfig = (await this.redisService.get(redisKey)) as AntiConfig;

    if (!antiConfig) {
      antiConfig = await this.serverRepository.getAntiConfigs(message.guildId);
      await this.redisService.set(redisKey, antiConfig, 300);
    }

    if (antiConfig) {
      this.config.rateLimit.window = antiConfig.antiSpamTimeWindow;
      this.config.rateLimit.maxMessages = antiConfig.antiSpamMaxMessagesCount;
      this.config.maxWarnings = antiConfig.antiSpamMaxWarnings;
    }

    const key = `spam:${message.author.id}`;
    let data = await this.redisService.get<{
      count: number;
      firstMessageTime: number;
      warnings: number;
    }>(key);

    if (!data) {
      data = { count: 0, firstMessageTime: Date.now(), warnings: 0 };
    }

    data.count++;
    const timeDiff = Date.now() - data.firstMessageTime;

    if (timeDiff <= this.config.rateLimit.window * 1000) {
      if (data.count > this.config.rateLimit.maxMessages) {
        data.warnings++;
        if (data.warnings >= this.config.maxWarnings) {
          // User is spamming excessively
          await this.takeAction(message);
          data.warnings = 0; // Reset warnings after taking action
          await this.redisService.del(key); // Reset count and warnings
        } else {
          await this.helperService.sendAutoDeleteMessage(
            message,
            `Warning ${data.warnings}/${this.config.maxWarnings}: Please refrain from spamming.`,
          );

          await this.redisService.set(key, data, this.config.rateLimit.window);
        }
      } else {
        // Update count and expiry in Redis
        await this.redisService.set(key, data, this.config.rateLimit.window);
      }
    } else {
      // Time window expired, reset count and warnings
      data = { count: 1, firstMessageTime: Date.now(), warnings: 0 };
      await this.redisService.set(key, data, this.config.rateLimit.window);
    }
  }

  private async takeAction(message: Message): Promise<void> {
    this.logger.warn(`Spam detected from user ${message.author.id}`);

    const serverLogChannels =
      await this.serverLogChannelRepository.findOneByServerId(message.guild.id);

    // Extract role IDs of the message author
    const roleIds = message.member.roles.cache.map((role) => role.id);

    const isOfficialAdminMod = await this.securityService.isOfficialAdminMod(
      message.member.id,
      message.guild.id,
      roleIds,
    );

    if (!isOfficialAdminMod) {
      await this.punishmentService.jailUser(
        message.guild.id,
        message.author.id,
        this.client,
        serverLogChannels.jailLogChannel
          ? serverLogChannels.jailLogChannel.id
          : null,
        `Jailed for spamming: Last Message ${message}`,
      );
    }
  }

  async handleEveryOnePing(message: Message) {
    // Check if the message contains @everyone or @here
    if (
      !message.content.includes('@everyone') &&
      !message.content.includes('@here')
    ) {
      return; // No action needed if there are no mentions
    }
    // Extract role IDs of the message author
    const roleIds = message.member.roles.cache.map((role) => role.id);
    
    const isOfficialAdminMod = await this.securityService.isOfficialAdminMod(
      message.member.id,
      message.guildId,
      roleIds
    );

    if (!isOfficialAdminMod) {
      // Create an embed for user notification
      const userNotificationEmbed = new EmbedBuilder()
        .setColor('#FF5555') // Bright red color
        .setTitle('🚨 Jail Alert! 🚨')
        .setDescription(
          `You have been jailed for using \`@everyone\` or \`@here\` excessively.`,
        )
        .addFields(
          {
            name: 'Your Last Message',
            value: message.content.substring(0, 1024),
          }, // Ensure content length is within limits
          {
            name: 'Notice',
            value:
              'Please adhere to the server rules to avoid further penalties.',
          },
        )
        .setTimestamp(new Date())
        .setFooter({ text: 'The moderation team' });

      // Send a direct message to the user
      try {
        await message.author.send({ embeds: [userNotificationEmbed] });
      } catch (error) {
        this.logger.error(`Failed to send DM: ${error}`);
      }

      // Log the action in the server log channel
      const serverLogChannels =
        await this.serverLogChannelRepository.findOneByServerId(
          message.guild.id,
        );
      // Execute the jailing action
      await this.punishmentService.jailUser(
        message.guild.id,
        message.author.id,
        this.client,
        serverLogChannels.jailLogChannel
          ? serverLogChannels.jailLogChannel.id
          : null,
        'Excessive use of everyone or here tag',
      );
    }
  }
}
