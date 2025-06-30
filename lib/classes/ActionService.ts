// action.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelType,
  Client,
  Guild,
  GuildVerificationLevel,
  PermissionsBitField,
  TextChannel,
} from 'discord.js';

@Injectable()
export class ActionService {
  private readonly logger = new Logger(ActionService.name);

  constructor() {}

  async takeAction(
    client: Client,
    guild: Guild,
    userId: string,
    actionType: string,
  ): Promise<void> {
    const member = await guild.members.fetch(userId);
    if (!member) {
      this.logger.warn(
        `Member with ID ${userId} not found in guild ${guild.name}.`,
      );
      return;
    }

    switch (actionType) {
      case 'kick':
        if (member.kickable) {
          await member.kick('Suspected raid participant');
          this.logger.log(
            `Kicked user ${member.user.tag} for suspected raid participation.`,
          );
        } else {
          this.logger.warn(
            `Cannot kick user ${member.user.tag}; lacking permissions.`,
          );
        }
        break;
      // Add more cases for 'ban', 'mute', etc.
      default:
        this.logger.error(`Unknown action type: ${actionType}`);
    }
  }
  async activateSlowMode(guild: Guild, slowModeSeconds: number) {
    const textChannels = guild.channels.cache.filter(
      (c) => c.type === ChannelType.GuildText,
    );
    for (const [_, channel] of textChannels) {
      await (channel as TextChannel).setRateLimitPerUser(slowModeSeconds);
    }
    this.logger.log(
      `Activated slow mode with ${slowModeSeconds} seconds interval in all text channels.`,
    );
  }

  async setGuildVerificationToVeryHigh(guild: Guild) {
    await guild.setVerificationLevel(GuildVerificationLevel.VeryHigh);
    this.logger.log(`Set guild verification level to Very High.`);
  }

  async deactivateSlowMode(guild: Guild) {
    const textChannels = guild.channels.cache.filter(
      (c) => c.type === ChannelType.GuildText,
    );
    for (const [_, channel] of textChannels) {
      await (channel as TextChannel).setRateLimitPerUser(0);
    }
    this.logger.log(`Deactivated slow mode in all text channels.`);
  }

  async resetGuildVerificationLevel(
    guild: Guild,
    originalVerificationLevel: GuildVerificationLevel,
  ) {
    await guild.setVerificationLevel(originalVerificationLevel);
    this.logger.log(`Reset guild verification level to its original state.`);
  }
}
