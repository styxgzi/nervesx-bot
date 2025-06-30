import { Injectable, Logger } from '@nestjs/common';
import {
  ActionRowBuilder,
  CommandInteraction,
  EmbedBuilder,
  Message,
  StringSelectMenuBuilder,
} from 'discord.js';
import { HelperService } from 'lib/classes/Helper';
import { SecurityService } from 'lib/classes/Security';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';
import { ServerConfigTypes } from 'lib/models/server.schema';
import { ServerRepository } from 'lib/repository/server.repository';
import { BOT_COMMANDS } from 'src/constants/strings';

@Injectable()
export class SetServerConfigCommandService {
  private readonly logger = new Logger(SetServerConfigCommandService.name);
  private confirmationMessage: string;
  private readonly stagingPrefix = !this.helperService.isProduction()
    ? 'test'
    : '';

  constructor(
    private readonly securityService: SecurityService,
    private readonly serverLoggerService: ServerLoggerService,
    private readonly serverRepository: ServerRepository,
    private readonly helperService: HelperService,
  ) {}

  async executeText(
    message: Message,
    args: string[],
    commandName: string,
  ): Promise<void> {
    if (!message.guild) {
      await message.reply('This command can only be used within a server.');
      return;
    }

    try {
      // Validate user permissions
      const hasPermission = await this.validateUserPermissions(message);
      if (!hasPermission) return;

      switch (commandName) {
        case this.stagingPrefix + BOT_COMMANDS.SET_PREFIX:
          await this.setPrefix(message, args);
          break;

        case this.stagingPrefix + BOT_COMMANDS.SET_SECOND_OWNER:
          await this.setSecondOwner(message, args);
          break;

        case this.stagingPrefix + BOT_COMMANDS.SET_MENTION_LIMIT:
          await this.setMentionLimit(message, args);
          break;

        case this.stagingPrefix + BOT_COMMANDS.SPAM_WHITELIST:
        case this.stagingPrefix + BOT_COMMANDS.SPAM_WHITELIST_ALIAS:
          await this.whitelistSpamUser(message, args);
          break;

        case this.stagingPrefix + BOT_COMMANDS.REMOVE_SPAM_WHITELIST:
        case this.stagingPrefix + BOT_COMMANDS.REMOVE_SPAM_WHITELIST_ALIAS:
          await this.removeUserFromSpamWhitelist(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.SET_ADMIN:
          await this.setAdmin(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.REMOVE_SET_ADMIN:
          await this.removeAdmin(message, args);
          break;
      }

      await message.reply(this.confirmationMessage);
      this.logger.log(this.confirmationMessage);
      await this.serverLoggerService.sendLogMessage(
        message.guild,
        LogChannelType.MODERATOR,
        this.confirmationMessage,
      );
    } catch (error) {
      this.handleError(message, error);
    }
  }

  async addUserToServerConfig(
    message: Message,
    args: string[],
    configType: ServerConfigTypes,
  ): Promise<void> {
    const user = await this.helperService.extractUser(message);
    if (!user) {
      await message.reply('Please mention a user to set as the second owner.');
      return;
    }
  }

  async setAdmin(message: Message, args: string[]): Promise<void> {
    // Attempt to get the first mentioned user in the command
    const user = await this.helperService.extractUser(message);
    if (!user) {
      await message.reply('Please mention a user to set as the admin.');
      return;
    }
    // Update server settings to add the second owner
    await this.serverRepository.addAdminUser(user.id, message.guildId);

    // Confirm the update to the user and log the action
    this.confirmationMessage = `${user} has been set as the admin for ${message.guild.name}.`;
  }

  async setAdminRole(message: Message, args: string[]): Promise<void> {
    // Attempt to get the first mentioned user in the command
    const role = await this.helperService.extractRole(message);
    if (!role) {
      await message.reply('Please mention a role to set as the admin.');
      return;
    }
    // Update server settings to add the second owner
    await this.serverRepository.addAdminRole(role.id, message.guildId);

    // Confirm the update to the role and log the action
    this.confirmationMessage = `${role} has been set as the admin for ${message.guild.name}.`;
  }

  async removeAdmin(message: Message, args: string[]): Promise<void> {
    // Attempt to get the first mentioned user in the command
    const user = await this.helperService.extractUser(message);
    if (!user) {
      await message.reply('Please mention a user to remove as the admin.');
      return;
    }
    // Update server settings to add the second owner
    await this.serverRepository.removeAdminUser(user.id, message.guildId);

    // Confirm the update to the user and log the action
    this.confirmationMessage = `${user} has been remove as the admin for ${message.guild.name}.`;
  }
  async removeAdminRole(message: Message, args: string[]): Promise<void> {
    // Attempt to get the first mentioned user in the command
    const role = await this.helperService.extractRole(message);
    if (!role) {
      await message.reply('Please mention a role to remove as the admin.');
      return;
    }
    // Update server settings to add the second owner
    await this.serverRepository.removeAdminRole(role.id, message.guildId);

    // Confirm the update to the role and log the action
    this.confirmationMessage = `${role} has been remove as the admin for ${message.guild.name}.`;
  }

  async setSecondOwner(message: Message, args: string[]): Promise<void> {
    // Attempt to get the first mentioned user in the command
    const user = await this.helperService.extractUser(message);
    if (!user) {
      await message.reply('Please mention a user to set as the second owner.');
      return;
    }
    // Update server settings to add the second owner
    await this.serverRepository.addSecondOwner(user.id, message.guildId);

    // Confirm the update to the user and log the action
    this.confirmationMessage = `${user} has been set as the second owner for ${message.guild.name}.`;
  }

  async whitelistSpamUser(message: Message, args: string[]): Promise<void> {
    // Attempt to get the first mentioned user in the command
    const user = await this.helperService.extractUser(message);
    if (!user) {
      await message.reply('Please mention a user to spam whitelist.');
      return;
    }
    // Update server settings to add the spam whitelist
    await this.serverRepository.addSpamWhiteListUser(user.id, message.guildId);

    // Confirm the update to the user and log the action
    this.confirmationMessage = `${user} has been added as spam whitelisted for ${message.guild.name}.`;
  }

  async removeUserFromSpamWhitelist(
    message: Message,
    args: string[],
  ): Promise<void> {
    // Attempt to get the first mentioned user in the command
    const user = await this.helperService.extractUser(message);
    if (!user) {
      await message.reply('Please mention a user to spam whitelist.');
      return;
    }
    // Update server settings to add the spam whitelist
    await this.serverRepository.removeUserFromSpamWhitelist(
      user.id,
      message.guildId,
    );

    // Confirm the update to the user and log the action
    this.confirmationMessage = `${user} has been removed from spam whitelisted for ${message.guild.name}.`;
  }

  private async setPrefix(message: Message, args: string[]) {
    // Validate command arguments
    const prefixName = args[0];
    if (!prefixName) {
      await message.reply('Please specify the prefix.');
      return;
    }
    // Update server prefix
    await this.serverRepository.setPrefix(prefixName, message.guildId);

    // Confirm update to the user and log action
    this.confirmationMessage = `Prefix updated to "${prefixName}". You can now use it to interact with me in ${message.guild.name}.`;
  }

  private async setMentionLimit(message: Message, args: string[]) {
    // Validate command arguments
    const limit = args[0];
    if (!limit) {
      await message.reply('Please specify the prefix.');
      return;
    }
    // Update server prefix
    await this.serverRepository.addMentionLimit(limit, message.guildId);

    // Confirm update to the user and log action
    this.confirmationMessage = `Mention Limit updated to "${limit}".`;
  }

  private async validateUserPermissions(message: Message): Promise<boolean> {
    const guildSecurityDetails =
      await this.serverRepository.getServerSecurityDetails(message.guildId);

    if (
      !guildSecurityDetails.owner.includes(message.author.id) &&
      !guildSecurityDetails.secondOwners.includes(message.author.id)
    ) {
      await message.reply(
        'You do not have permission to configure server settings.',
      );
      return false;
    }

    return true;
  }

  private async handleError(message: Message, error: Error): Promise<void> {
    this.logger.error('SetServerConfigCommandService Error:', error);
    await message.reply('An error occurred while processing your request.');
  }

  getSelectMenu() {
    // Dynamic generation of options for mention limits
    const mentionLimitOptions = Array.from({ length: 10 }, (_, i) => ({
      label: `${i + 1}`,
      value: `${i + 1}`,
    }));

    const mentionLimitMenu =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(this.stagingPrefix + 'mention-limits')
          .setPlaceholder('Choose a Mention Limit')
          .addOptions(mentionLimitOptions),
      );

    const inviteOnlyMenu =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(this.stagingPrefix + 'invite-only')
          .setPlaceholder('Server Access Policy')
          .addOptions([
            {
              label: 'Enable Invite Only',
              description: 'Make the server exclusive to invited members only.',
              value: 'invite-only-yes',
            },
            {
              label: 'Disable Invite Only',
              description: 'Open the server to the public.',
              value: 'invite-only-no',
            },
          ]),
      );

    return [mentionLimitMenu, inviteOnlyMenu];
  }

  async getServerConfigEmbed(
    interaction: CommandInteraction | Message,
    args: any[],
  ) {
    const prefix =
      (await this.serverRepository.getServerPrefix(interaction.guildId)) || '!';
    const helpEmbed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('Server Configuration')
      .setDescription(`Server configuration for ${interaction.guild.name}.`)
      .setTimestamp();

    const selectMenu = this.getSelectMenu();
    if (interaction instanceof CommandInteraction) {
      await interaction.reply({
        embeds: [helpEmbed],
        components: selectMenu,
        ephemeral: true,
      });
    } else if ('channel' in interaction) {
      await interaction.channel.send({
        embeds: [helpEmbed],
        components: selectMenu,
      });
    }
  }
}
