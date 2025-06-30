import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
} from 'discord.js';
import { AfkStatus, AfkStatusDocument } from 'lib/models/afkstatus.schema';
import { HelperService } from 'lib/classes/Helper';
import { AfkRepository } from 'lib/repository/afk.repository';

@Injectable()
export class AfkService {
  constructor(
    @InjectModel(AfkStatus.name)
    private afkStatusModel: Model<AfkStatusDocument>,
    private readonly helperService: HelperService,
    private readonly afkRepository: AfkRepository,
  ) {}

  private readonly stagingPrefix = !this.helperService.isProduction()
    ? 'test'
    : '';

  async handleAfkStatus(message: Message) {
    // Remove AFK status if the message author was AFK
    const authorAfkStatus = await this.removeAfkStatusIfNeeded(
      message.author.id,
    );
    if (authorAfkStatus.removed) {
      const removedAfkEmbed = new EmbedBuilder()
        .setColor('#00FF00') // Green color for returning from AFK
        .setTitle('Welcome Back!')
        .setDescription(
          `${message.author.username}, your AFK status has been removed.`,
        )
        .setTimestamp();

      await message.reply({ embeds: [removedAfkEmbed] });
    }

    // Check and respond if mentioned users are AFK
    message.mentions.users.forEach(async (mentionedUser) => {
      if (mentionedUser.bot) return;
      await this.checkAndRespondIfAfk(message, mentionedUser.id);
    });
  }

  // Inside your command handling service or controller
  async sendAfkCommandEmbed(message: Message, args: string[]) {
    const afkStatusMessage = args.join(' ');
    //  Set AFK status
    // await this.afkRepository.setAfkStatus(message.author.id, afkStatusMessage);

    const afkEmbed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('Set AFK Status')
      .setDescription(`Reason: ${afkStatusMessage} \nChoose your AFK mode:`)
      .setTimestamp();

    const data = {
      userId: message.author.id,
      reason: afkStatusMessage,
    };

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(
          JSON.stringify({
            action: this.stagingPrefix + 'server_afk',
            data,
          }),
        )
        .setLabel('Server AFK')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(
          JSON.stringify({
            action: this.stagingPrefix + 'global_afk',
            data,
          }),
        )
        .setLabel('Global Server AFK')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(
          JSON.stringify({
            action: this.stagingPrefix + 'cancel_afk',
            data,
          }),
        )
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger),
    );

    await message.channel.send({
      embeds: [afkEmbed],
      components: [buttons],
    });
  }

  async setServerAfk(message: Message, args: string[]) {
    const reason = args.join(' ') || 'AFK';
    await this.setAfk(message.author.id, reason, message.guild.id);
    message.reply(`You are now set as AFK in this server: ${reason}`);
  }

  async setAllServerAfk(message: Message, args: string[]) {
    const reason = args.join(' ') || 'AFK';
    await this.setAfk(message.author.id, reason, message.guild.id, true);
    message.reply(`You are now set as AFK across all servers: ${reason}`);
  }

  async executeText(message: Message, args: string[]) {
    const reason = args.join(' ') || 'AFK';
    await this.setAfk(message.author.id, reason, message.guild.id);
    message.reply(`You are now set as AFK in this server: ${reason}`);
  }

  async setAfk(
    discordId: string,
    reason: string,
    guildId?: string,
    isGlobal = false,
  ): Promise<void> {
    const query = isGlobal
      ? { discordId, isGlobal: true }
      : { discordId, guildId };
    const update = {
      reason,
      timestamp: new Date(),
      isGlobal,
      ...(guildId && { guildId }),
    };
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };

    await this.afkStatusModel.findOneAndUpdate(query, update, options);
  }

  async checkMentions(message: Message): Promise<void> {
    for (const user of message.mentions.users.values()) {
      const afkStatuses = await this.afkStatusModel.find({
        discordId: user.id,
      });

      afkStatuses.forEach((afkStatus) => {
        if (afkStatus.isGlobal || afkStatus.guildId === message.guild.id) {
          message.channel.send(
            `${user.username} is currently AFK: ${
              afkStatus.reason
            } - since ${afkStatus.timestamp.toLocaleString()}`,
          );
        }
      });
    }
  }

  async removeAfkStatus(
    discordId: string,
    guildId?: string,
    isGlobal = false,
  ): Promise<void> {
    const query = isGlobal
      ? { discordId, isGlobal: true }
      : { discordId, guildId };
    await this.afkStatusModel.findOneAndDelete(query);
  }

  async handleMessage(message: Message): Promise<void> {
    if (message.author.bot) return;

    const queryGlobal = { discordId: message.author.id, isGlobal: true };
    const queryServer = {
      discordId: message.author.id,
      guildId: message.guild.id,
    };
    const afkStatusGlobal = await this.afkStatusModel.findOne(queryGlobal);
    const afkStatusServer = await this.afkStatusModel.findOne(queryServer);

    if (afkStatusGlobal || afkStatusServer) {
      await this.removeAfkStatus(
        message.author.id,
        message.guild.id,
        afkStatusGlobal ? true : false,
      );
      const botMessage = await message.reply(
        'Welcome back! Your AFK status has been removed.',
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }

    await this.checkMentions(message);
  }

  // Inside your AFK service
  async removeAfkStatusIfNeeded(userId: string): Promise<{ removed: boolean }> {
    // Placeholder for checking and removing AFK status in database
    const afkStatus = await this.afkRepository.findAfkStatusByUserId(userId);

    if (afkStatus) {
      await this.afkRepository.removeAfkStatusByUserId(userId);
      return { removed: true };
    } else {
      return { removed: false };
    }
  }

  async checkAndRespondIfAfk(message: Message, userId: string) {
    try {
      const afkStatus = await this.getAfkStatus(userId);
      if (afkStatus.isAfk && message.guildId == afkStatus.guildId) {
        const afkEmbed = new EmbedBuilder()
          .setColor('#FFA500') // Orange color
          .setTitle('AFK Status')
          .addFields(
            {
              name: 'User',
              value: `<@${userId}> is currently AFK.`,
              inline: true,
            },
            { name: 'Reason', value: afkStatus.reason, inline: false },
            { name: 'AFK Since', value: afkStatus.since, inline: false }, // Add the since duration here
          )
          .setFooter({ text: 'Be back soon!' });

        const botMessage = await message.reply({ embeds: [afkEmbed] });
        return await this.helperService.deleteLastBotMessageAfterInterval(
          botMessage,
        );
      }
    } catch (error) {
      console.log(error);
    }
  }

  async getAfkStatus(userId: string): Promise<{
    isAfk: boolean;
    reason: string;
    since: string;
    guildId: string;
  }> {
    const userAfkStatus =
      await this.afkRepository.findAfkStatusByUserId(userId);

    if (userAfkStatus) {
      const now = new Date();
      const afkSince = new Date(userAfkStatus.timestamp);
      const diff = now.getTime() - afkSince.getTime();

      // Convert difference from milliseconds to a more readable format
      // For simplicity, this example only calculates hours, minutes, and seconds
      let seconds = Math.floor(diff / 1000);
      const hours = Math.floor(seconds / 3600);
      seconds %= 3600;
      const minutes = Math.floor(seconds / 60);
      seconds %= 60;

      // Format the string
      const sinceStr = `${hours > 0 ? `${hours}h ` : ''}${
        minutes > 0 ? `${minutes}m ` : ''
      }${seconds}s`;

      return {
        isAfk: true,
        reason: userAfkStatus.reason,
        since: sinceStr,
        guildId: userAfkStatus.guildId,
      };
    } else {
      return { isAfk: false, reason: '', since: '', guildId: '' };
    }
  }
}
