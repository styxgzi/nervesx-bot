import { Injectable, Logger } from '@nestjs/common';
import {
  CommandInteraction,
  Message,
  Guild,
  EmbedBuilder,
  ChannelType,
  GuildPremiumTier,
  PermissionsBitField,
  TextChannel,
  GuildAuditLogsEntry,
  AuditLogEvent,
} from 'discord.js';
import { HelperService } from 'lib/classes/Helper';
import { SecurityService } from 'lib/classes/Security';
import { ServerRepository } from 'lib/repository/server.repository';

@Injectable()
export class ServerInfoService {
  private readonly logger = new Logger(ServerInfoService.name);

  constructor(
    private readonly serverRepository: ServerRepository,
    private readonly helperService: HelperService,
    private readonly securityService: SecurityService,
  ) {}

  async generateServerInfoEmbed(guild: Guild): Promise<EmbedBuilder> {
    // Fetch guild owner safely
    const owner = await guild.fetchOwner().catch((err) => {
      this.logger.warn(`Error fetching guild owner: ${err}`);
      return null; // Use null to represent failure to fetch owner
    });

    // Compile information with safeguards for each piece of data
    const embed = new EmbedBuilder()
      .setColor('#00BFFF')
      .setTitle(`${guild.name} Server Information`)
      .setThumbnail(guild.iconURL({}) || '')
      .addFields(
        { name: 'Server Owner', value: owner.user.tag },
        {
          name: 'Owner Avatar',
          value: `[View Avatar](${owner.user.displayAvatarURL({
            dynamic: true,
          })})`,
        },
        { name: 'Member Count', value: `${guild.memberCount.toString()}` },
        {
          name: 'Text Channels',
          value: `${guild.channels.cache
            .filter((channel) => channel.type === ChannelType.GuildText)
            .size.toString()}`,
        },
        {
          name: 'Voice Channels',
          value: `${guild.channels.cache
            .filter((channel) => channel.type === ChannelType.GuildVoice)
            .size.toString()}`,
        },
        { name: 'Roles', value: `${guild.roles.cache.size.toString()}` },
        { name: 'Emojis', value: `${guild.emojis.cache.size.toString()}` },
        {
          name: 'Categories',
          value: `${guild.channels.cache
            .filter((channel) => channel.type === ChannelType.GuildCategory)
            .size.toString()}`,
        },
        { name: 'Server Created', value: `${guild.createdAt.toUTCString()}` },
        {
          name: 'Boost Level',
          value: `${GuildPremiumTier[guild.premiumTier]}`,
        },
        {
          name: 'Boost Count',
          value: `${guild.premiumSubscriptionCount.toString()}`,
        },
        {
          name: 'Vanity URL',
          value: `${
            guild.vanityURLCode
              ? `https://discord.gg/${guild.vanityURLCode}`
              : 'None'
          }`,
        },
        {
          name: 'Server Logo',
          value: `${
            guild.iconURL() ? `[View Logo](${guild.iconURL({})})` : 'None'
          }`,
        },
      )
      .setFooter({ text: `Guild ID: ${guild.id}` })
      .setTimestamp();

    // More fields can be added here following the same pattern
    return embed;
  }

  async getServerWhiteListedUsers(message: Message) {
    const guild: Guild = message.guild;
    const serverSecurityDetails =
      await this.serverRepository.getServerSecurityDetails(guild.id);
    const roleIds = message.member.roles.cache.map((role) => role.id);
    const isOfficialAdminMod = await this.securityService.isOfficialAdminMod(
      message.member.id,
      message.guildId,
      roleIds,
    );
    if (!isOfficialAdminMod) {
      const botMessage = await message.reply(
        'You are not authorized to execute this command!',
      );
      await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
        20000,
      );
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('#00BFFF')
      .setTitle(`${guild.name} Server Information`)
      .setThumbnail(guild.iconURL({}) || '')
      .addFields({
        name: 'Whitelisted Users',
        value: `${
          (serverSecurityDetails.whitelistedUserIds || [])
            .map((userId) => `<@${userId}>`)
            .join('\n') || 'None'
        }`,
      })
      .setFooter({ text: `Guild ID: ${guild.id}` })
      .setTimestamp();
    return this.helperService.sendAutoDeleteMessage(message, '', 20000, [
      embed,
    ]);
  }

  async getServerOfficials(message: Message): Promise<EmbedBuilder> {
    const guild: Guild = message.guild;
    const serverSecurityDetails =
      await this.serverRepository.getServerSecurityDetails(guild.id);
    const roleIds = message.member.roles.cache.map((role) => role.id);
    const isOfficialAdminMod = await this.securityService.isOfficialAdminMod(
      message.member.id,
      message.guildId,
      roleIds,
    );
    if (!isOfficialAdminMod) {
      const botMessage = await message.reply(
        'You are not authorized to execute this command!',
      );
      await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
        20000,
      );
      return;
    }

    // Compile information with safeguards for each piece of data
    const embed = new EmbedBuilder()
      .setColor('#00BFFF')
      .setTitle(`${guild.name} Server Information`)
      .setThumbnail(guild.iconURL({}) || '')
      .addFields(
        {
          name: 'Admin Roles',
          value: `${
            guild.roles.cache
              .filter((role) =>
                role.permissions.has(PermissionsBitField.Flags.Administrator),
              )
              .map((role) => `<@&${role.id}>`)
              .join('\n') || 'None'
          }`,
        },
        {
          name: 'Whitelisted Admin Users',
          value: `${
            (serverSecurityDetails.adminIds || [])
              .map((userId) => `<@${userId}>`)
              .join('\n') || 'None'
          }`,
        },
        {
          name: 'Whitelisted Mods Users',
          value: `${
            (serverSecurityDetails.modIds || [])
              .map((userId) => `<@${userId}>`)
              .join('\n') || 'None'
          }`,
        },
      )
      .setFooter({ text: `Guild ID: ${guild.id}` })
      .setTimestamp();

    return embed;
  }

  async serverOfficials(message: Message): Promise<void> {
    if (!message.guild) {
      await message.reply('This command can only be used within a server.');
      return;
    }

    try {
      const embed = await this.getServerOfficials(message);
      const botMessage = await message.reply({ embeds: [embed] });
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
        20000,
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate server info for text command: ${error}`,
      );
      await message.reply(
        'An error occurred while fetching server information.',
      );
    }
  }

  async executeText(message: Message): Promise<void> {
    if (!message.guild) {
      await message.reply('This command can only be used within a server.');
      return;
    }

    try {
      const embed = await this.generateServerInfoEmbed(message.guild);
      const botMessage = await message.reply({ embeds: [embed] });
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate server info for text command: ${error}`,
      );
      await message.reply(
        'An error occurred while fetching server information.',
      );
    }
  }

  async executeInteraction(interaction: CommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({
        content: 'This command can only be used within a server.',
        ephemeral: true,
      });
      return;
    }

    try {
      const embed = await this.generateServerInfoEmbed(interaction.guild);
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      this.logger.error(
        `Failed to generate server info for interaction: ${error}`,
      );
      await interaction.reply({
        content: 'An error occurred while fetching server information.',
        ephemeral: true,
      });
    }
  }

  async getAuditLogs(message: Message, args: string[]) {
    const guild = message.guild;
    const limit = +args.shift() || 2;
    const roleIds = message.member.roles.cache.map((role) => role.id);
    const isOfficialAdminMod = await this.securityService.isOfficialAdminMod(
      message.member.id,
      message.guildId,
      roleIds,
    );
    if (!isOfficialAdminMod) {
      await this.helperService.sendAutoDeleteMessage(
        message,
        'You are not authorized to execute this command!',
        20000,
      );
      return;
    }

    const auditLogs = await guild.fetchAuditLogs({ limit: limit });
    const embeds = this.buildAuditLogEmbeds(
      Array.from(auditLogs.entries.values()),
    );
    return this.helperService.sendAutoDeleteMessage(message, '', 20000, embeds);
  }

  private buildAuditLogEmbeds(auditLogs: any[]): EmbedBuilder[] {
    const embeds: EmbedBuilder[] = [];

    for (const log of auditLogs) {
      const action = log.actionType ? String(log.actionType) : 'N/A';

      const embed = new EmbedBuilder()
        .setTitle(action)
        .setColor('#FFD700')
        .setTimestamp()
        .setThumbnail('https://example.com/thumbnail.png')
        .addFields(
          {
            name: 'Action',
            value: action,
            inline: true,
          },
          {
            name: 'User',
            value: log.executor?.tag || 'N/A',
            inline: true,
          },
          {
            name: 'Target',
            value: log.targetId || 'None',
            inline: true,
          },
          {
            name: 'Reason',
            value: log.reason || 'None',
            inline: true,
          },
        );

      embeds.push(embed);
    }

    return embeds;
  }
}
