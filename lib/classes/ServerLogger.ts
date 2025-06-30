import { Injectable, Logger } from '@nestjs/common';
import { Embed, EmbedBuilder, Guild, TextChannel } from 'discord.js';
import { ServerLogChannelRepository } from '../repository/server-log-channel.repository';

export const enum LogChannelType {
  JAIL = 'jailLogChannel',
  LEAVE = 'leaveLogChannel',
  JOIN = 'joinLogChannel',
  MESSAGE = 'messageLogChannel',
  MODERATOR = 'modLogChannel',
  SERVER = 'serverLogChannel',
}

@Injectable()
export class ServerLoggerService {
  private readonly logger = new Logger(ServerLoggerService.name);

  constructor(
    private readonly serverLogChannelRepository: ServerLogChannelRepository,
  ) {}

  logEmbed(
    title: string,
    description: string,
    fields: any[],
    timestamp: number | Date,
  ): EmbedBuilder {
    return new EmbedBuilder()
      .setColor('#ff5555') // Red color for warning
      .setTitle(title)
      .setDescription(description)
      .addFields(fields)
      .setTimestamp(timestamp);
  }

  async sendLogMessage(
    guild: Guild,
    logChannelType: string,
    message: string,
    embed?: EmbedBuilder,
  ): Promise<void> {
    const server = await this.serverLogChannelRepository.findOneById(guild.id);
    const logChannelId = server ? server[logChannelType] : null;

    if (!logChannelId) {
      console.log(`Could not find log channel for type: ${logChannelType}.`);
      return;
    }

    const channel = await guild.channels.fetch(logChannelId.id);
    if (!channel || !(channel instanceof TextChannel)) {
      this.logger.error(
        `Channel with ID ${logChannelId} not found or is not a text channel.`,
      );
      return;
    }

    // Check if an embed is provided, and send it along with the message
    if (embed) {
      await channel.send({ content: message, embeds: [embed] });
    } else {
      await channel.send(message);
    }
  }
}
