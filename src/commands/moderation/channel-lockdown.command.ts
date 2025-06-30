import { Injectable, Logger } from '@nestjs/common';
import { Message, PermissionsBitField, TextChannel } from 'discord.js';

@Injectable()
export class ChannelLockService {
  private readonly logger = new Logger(ChannelLockService.name);

  constructor() {}

  async lockChannel(message: Message): Promise<void> {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)
    ) {
      await message.reply("You don't have permission to lock channels.");
      return;
    }

    const channel = message.channel;
    if (!(channel instanceof TextChannel)) {
      await message.reply('This command can only be used in text channels.');
      return;
    }

    try {
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: false,
        AddReactions: false,
      });
      await message.reply('🔒 This channel has been locked.');
    } catch (error) {
      this.logger.error(`Failed to lock the channel: ${error}`);
      await message.reply('Failed to lock the channel.');
    }
  }

  async unlockChannel(message: Message): Promise<void> {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)
    ) {
      await message.reply("You don't have permission to unlock channels.");
      return;
    }

    const channel = message.channel;
    if (!(channel instanceof TextChannel)) {
      await message.reply('This command can only be used in text channels.');
      return;
    }

    try {
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
          SendMessages: null,
          AddReactions: null,
      });
      await message.reply('🔓 This channel has been unlocked.');
    } catch (error) {
      this.logger.error(`Failed to unlock the channel: ${error}`);
      await message.reply('Failed to unlock the channel.');
    }
  }
}
