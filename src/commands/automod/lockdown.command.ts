import { Injectable, Logger } from '@nestjs/common';
import {
  Guild,
  ChannelType,
  PermissionsBitField,
  TextChannel,
  VoiceChannel,
  Message,
} from 'discord.js';
import { SecurityService } from 'lib/classes/Security';

@Injectable()
export class ServerLockDownService {
  private readonly logger = new Logger(ServerLockDownService.name);

  constructor(private readonly securityService: SecurityService) {}

  async executeText(message: Message, args: string[]) {
    const isUserToWhiteListIsWhitelisted =
      await this.securityService.isUserWhitelisted(
        message.member.id,
        message.guild.id,
      );

    if (!isUserToWhiteListIsWhitelisted) {
      message.reply('You are not whitelisted to kick the user.');
      return;
    }
    
    const lockStatus = args[0].toLowerCase() === 'enable';

    await this.toggleLockDown(message.guild, lockStatus);
  }
  async toggleLockDown(guild: Guild, lock: boolean): Promise<void> {
    // Fetch the bot's member object in the guild to check permissions
    const botMember = await guild.members.fetch(guild.client.user.id);

    guild.channels.cache.forEach(async (channel) => {
      if (
        channel.type === ChannelType.GuildText ||
        channel.type === ChannelType.GuildVoice
      ) {
        try {
          // Ensure bot has permission to manage roles in the channel
          if (
            !botMember
              .permissionsIn(channel)
              .has(PermissionsBitField.Flags.ManageRoles)
          ) {
            this.logger.warn(
              `Bot does not have ManageRoles permission in the channel: ${channel.name}`,
            );
            return;
          }

          if (lock) {
            await channel.permissionOverwrites.edit(
              guild.roles.everyone,
              {
                SendMessages: false,
                Connect: false,
              },
              { reason: 'Server lockdown initiated' },
            );
          } else {
            // Assuming permissions were only modified by the lockdown, remove overrides to revert
            await channel.permissionOverwrites.edit(
              guild.roles.everyone,
              {
                SendMessages: null,
                Connect: null,
              },
              { reason: 'Server lockdown lifted' },
            );
          }
          this.logger.log(
            `Lockdown ${lock ? 'enabled' : 'disabled'} for channel: ${
              channel.name
            }`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to ${lock ? 'lock' : 'unlock'} channel: ${channel.name}`,
            error,
          );
        }
      }
    });

    // Notify server members about the lockdown state
    if (botMember.permissions.has(PermissionsBitField.Flags.SendMessages)) {
      this.notifyServer(guild, lock);
    }
  }

  private async notifyServer(guild: Guild, lock: boolean) {
    const notificationChannel = guild.channels.cache.find(
      (channel) =>
        channel.isTextBased() &&
        channel
          .permissionsFor(guild.members.me)
          .has(PermissionsBitField.Flags.SendMessages), // Corrected line
    ) as TextChannel;

    if (notificationChannel) {
      await notificationChannel.send(
        `Server is now ${
          lock
            ? '**locked down**. Please stand by for further instructions.'
            : '**open**. Normal activities can resume.'
        }`,
      );
    } else {
      this.logger.warn('No suitable channel found for lockdown notification.');
    }
  }
}
