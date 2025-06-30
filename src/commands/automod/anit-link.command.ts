import { Injectable } from '@nestjs/common';
import {
  CommandInteraction,
  EmbedBuilder,
  Message,
  PermissionsBitField,
} from 'discord.js';
import { LinkDetectionService } from 'lib/classes/LinkDetectionService';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';
import { ServerRepository } from 'lib/repository/server.repository';

@Injectable()
export class AntiLinkCommandService {
  constructor(
    private readonly serverLoggerService: ServerLoggerService,
    private readonly serverRepository: ServerRepository,
    private readonly linkDetectionService: LinkDetectionService,
  ) {}

  async handleAntiLink(message: Message) {
    if (!message.guild || message.author.bot) return;

    if (
      message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return;
    }

    const hasLink = this.linkDetectionService.detectAllLinks(message.content);
    const hasDiscordLink = this.linkDetectionService.detectDiscordInvites(
      message.content,
    );

    const hasGiftPerms = message.member.permissions.has(
      PermissionsBitField.Flags.EmbedLinks,
    );

    const antiLinkAllowedChannels =
      await this.serverRepository.getAntiLinkChannels(message.guildId);
    if (!hasLink) return;

    const hasGif = this.linkDetectionService.detectGifs(message.content);

    if (hasGif) {
      if (hasGiftPerms) {
        return;
      } else {
        return message.author.send({
          content: 'You do not have permission to send GIFs to this channel. ',
        });
      }
    }

    if (
      !hasDiscordLink &&
      antiLinkAllowedChannels.includes(message.channelId) &&
      hasGiftPerms
    ) {
      return;
    }

    await this.deleteMessage(message);
  }

  async deleteMessage(message: Message) {
    try {
      console.log(
        `Disallowed link detected and removed in ${message.guild.name}`,
        message.content,
      );

      await message.delete();

      // Send a DM to the user
      const dmEmbed = new EmbedBuilder()
        .setColor('#ff5555') // Red color for warning
        .setTitle('Link Alert! 🚫🖼️')
        .setDescription(
          `Hey there, sparky! 🌟 Your message in **${message.guild.name}** just poofed away because it had a link that wasn’t a GIF. We're on a strict GIF diet here! 📉🖼️`,
        )
        .setTimestamp(message.createdAt);

      await message.author
        .send({ embeds: [dmEmbed] })
        .catch((error) =>
          console.error(`Could not send DM to ${message.author.tag}.`, error),
        );

      // Log the message deletion in the server log channel
      const logEmbed = new EmbedBuilder()
        .setColor('#ff5555') // Red color for warning
        .setTitle('Link Deletion Alert! 🚨')
        .setDescription(
          `Heads up, team! 🚨 ${message.author.tag} just tried to sneak in a non-GIF link into **${message.guild.name}**. But worry not, I zapped it away! ⚡️🔗`,
        )
        .addFields(
          { name: 'User', value: message.author.toString(), inline: true },
          { name: 'Channel', value: message.channel.toString(), inline: true },
          { name: 'Message Content', value: message.content.slice(0, 1024) }, // Truncate if too long
        )
        .setTimestamp(message.createdAt);

      await this.serverLoggerService.sendLogMessage(
        message.guild,
        LogChannelType.MESSAGE,
        '',
        logEmbed,
      );
    } catch (error) {
      console.error('Failed to delete message or warn user:', error);
    }
  }
}
