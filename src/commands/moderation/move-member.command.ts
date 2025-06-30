import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelType,
  Message,
  PermissionsBitField,
  VoiceChannel,
} from 'discord.js';
import { HelperService } from 'lib/classes/Helper';
import { ServerLoggerService } from 'lib/classes/ServerLogger';

@Injectable()
export class MoveAllMembersService {
  private readonly logger = new Logger(MoveAllMembersService.name);

  constructor(
    private readonly serverLoggerService: ServerLoggerService,
    private readonly helperService: HelperService,
  ) {}

  async executeText(message: Message, args: string[]): Promise<void> {
    // Check if the message member has permission to move members
    if (
      !message.member?.permissions.has(PermissionsBitField.Flags.MoveMembers)
    ) {
      await message.reply('You do not have permission to move members.');
      return;
    }

    // Ensure the command issuer is in a voice channel
    const sourceChannel = message.member.voice.channel;
    if (!sourceChannel) {
      const botMessage = await message.reply(
        'You need to be in a voice channel to use this command.',
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }

    // Extract the target channel ID from mention or plain ID
    const targetChannelInput = args[0].replace('<#', '').replace('>', ''); // Strip mention format if present
    const targetChannel = message.guild?.channels.cache.get(
      targetChannelInput,
    ) as VoiceChannel;
    if (!targetChannel || targetChannel.type !== ChannelType.GuildVoice) {
      const botMessage = await message.reply(
        'Invalid target channel. Make sure you provide a valid voice channel ID or mention.',
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }

    // Move all members from source to target channel
    try {
      for (const member of sourceChannel.members.values()) {
        await member.voice.setChannel(targetChannel);
      }

      const botMessage = await message.channel.send(
        `Moved all members from ${sourceChannel.name} to ${targetChannel.name}.`,
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    } catch (error) {
      this.logger.error(`Failed to move members: ${error}`);
      await message.reply('There was an error trying to move the members.');
    }
  }
}
