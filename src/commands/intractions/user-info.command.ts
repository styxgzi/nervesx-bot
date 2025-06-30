import { Injectable, Logger } from '@nestjs/common';
import { Message, EmbedBuilder, GuildMember, User } from 'discord.js';
import { EmbedOptions, HelperService } from 'lib/classes/Helper';
import { DailyMessageCountService } from 'lib/services/MessageCount.service';

@Injectable()
export class UserInfoCommandService {
  private readonly logger = new Logger(UserInfoCommandService.name);

  constructor(
    private readonly helperService: HelperService,
    private readonly dailyMessageCountService: DailyMessageCountService,
  ) {}

  async execute(message: Message): Promise<void> {
    // Determine the target user: mentioned user or the message author
    const targetUser: User =
      (await this.helperService.extractUser(message)) || message.author;
    const targetMember: GuildMember = await message.guild.members
      .fetch(targetUser.id)
      .catch((error) => {
        this.logger.error(`Failed to fetch member: ${error}`);
        return null;
      });

    if (!targetMember) {
      await message.reply("Couldn't fetch user information.");
      return;
    }

    // Build and send the user info embed
    const userInfoEmbed = this.generateUserInfoEmbed(targetMember);
    await message.reply({ embeds: [userInfoEmbed] });
  }

  private generateUserInfoEmbed(member: GuildMember): EmbedBuilder {
    const user = member.user;
    const roles =
      member.roles.cache
        .filter((role) => role.id !== member.guild.id) // Exclude the @everyone role
        .map((role) => role.name.toString())
        .join(',') || 'None';
    const roleNames = member.roles.cache
      .filter((role) => role.id !== member.guild.id)
      .sort((a, b) => b.position - a.position)
      .map((role) => role.toString());

    // Join role name with a newline to form a list,limit to prevent character overflow
    let rolesList = roleNames.join('\n');
    if (rolesList.length > 1024) {
      // Truncate the list to fit within the embed field character limit
      rolesList = rolesList.substring(0, 1021) + '...';
    }

    // Use formatDate for joinedAt and createdAt
    const joinedAtFormatted = member.joinedAt
      ? this.helperService.formatDate(new Date(member.joinedAt))
      : 'Unknown';
    const createdAtFormatted = this.helperService.formatDate(
      new Date(user.createdAt),
    );

    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}'s Information`)
      .setThumbnail(user.displayAvatarURL({}))
      .setColor('#00BFFF')
      .addFields([
        { name: 'Username', value: user.username, inline: true },
        { name: 'ID', value: user.id, inline: true },
        {
          name: 'Avatar URL',
          value: `[Click Here](${user.displayAvatarURL({})})`,
          inline: false,
        },
        { name: 'Roles', value: rolesList || 'None', inline: false },
        {
          name: 'Joined Server On',
          value: joinedAtFormatted,
          inline: true,
        },
        {
          name: 'Account Created On',
          value: createdAtFormatted,
          inline: true,
        },
      ])
      .setFooter({
        text: 'User Info',
        iconURL: user.displayAvatarURL({}),
      })
      .setTimestamp();

    return embed;
  }

  async displayUserStats(message: Message, args: string[]): Promise<void> {
    if (!message.guild) return; // Ensure this is within a guild

    const user =
      (await this.helperService.extractUser(message)) || message.author;
    const guildId = message.guild.id;

    const todayCount =
      await this.dailyMessageCountService.getMessageCountForToday(
        user.id,
        guildId,
      );

    const weekCount =
      await this.dailyMessageCountService.getLastOneWeekMessageCount(
        user.id,
        guildId,
      );
    const monthCount =
      await this.dailyMessageCountService.getLastOneMonthMessageCount(
        user.id,
        guildId,
      );
    const yearCount =
      await this.dailyMessageCountService.getLastOneYearMessageCount(
        user.id,
        guildId,
      );
    const allTimeCount =
      await this.dailyMessageCountService.getAllTimeMessageCount(
        user.id,
        guildId,
      );

    const embed: EmbedOptions = {
      title: `🎓 Message Activity Summary`,
      author: {
        name: message.guild.name,
        iconURL: message.guild.iconURL(),
        url: message.guild.iconURL(),
      },
      description: `Here's the message activity summary for <@${user.id}>`,
      fields: [
        { name: 'Today', value: todayCount.toString(), inline: true },
        { name: 'All Time', value: allTimeCount.toString(), inline: true },
        { name: 'Last Week', value: weekCount.toString(), inline: true },
        { name: 'Last Month', value: monthCount.toString(), inline: true },
        { name: 'Last Year', value: yearCount.toString(), inline: true },
        { name: ' ', value: ' ', inline: true },
      ],
      color: '#00BFFF',
      timestamp: new Date(),
      thumbnailURL: message.guild.iconURL(),
      footer: {
        text: 'Message statistics powered by your bot',
        iconURL: message.guild.iconURL(),
      },
    };
    await message.reply({ embeds: [this.helperService.createEmbed(embed)] });
  }

  async displayTopUsersByMessageCount(message: Message): Promise<void> {
    if (!message.guild) return; // Ensure this is within a guild

    const guildId = message.guild.id;
    const topUsers =
      await this.dailyMessageCountService.getTopUsersByMessageCount(guildId);

    if (!topUsers.length) {
      await message.reply('No message data available.');
      return;
    }

    const userDescriptions = topUsers
      .map(
        (user, index) =>
          `${index + 1}. <@${user._id}> - ${user.totalMessages} messages`,
      )
      .join('\n');

    const embed: EmbedOptions = {
      title: `🎓 Top Messages for this month`,
      author: {
        name: message.guild.name,
        iconURL: message.guild.iconURL(),
        url: message.guild.iconURL(),
      },
      description: userDescriptions,
      fields: [],
      color: '#00BFFF',
      timestamp: new Date(),
      thumbnailURL: message.guild.iconURL(),
      footer: {
        text: 'Message count leaderboard',
        iconURL: message.guild.iconURL(),
      },
    };

    await message.reply({ embeds: [this.helperService.createEmbed(embed)] });
  }
}
