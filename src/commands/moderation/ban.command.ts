import {
  CommandInteraction,
  GuildMember,
  PermissionFlagsBits,
} from 'discord.js';
import { Injectable, Logger } from '@nestjs/common';
import { BOT_TEXTS } from 'src/constants/strings';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';
import { HelperService } from 'lib/classes/Helper';

@Injectable()
export class BanCommandService {
  private readonly logger = new Logger(BanCommandService.name);

  constructor(
    private readonly serverLoggerService: ServerLoggerService,
    private readonly helperService: HelperService,
  ) {}

  /**
   * Execute the ban command
   * @param interaction - The command interaction
   */
  async execute(interaction: CommandInteraction) {
    if (!interaction.guild) return;

    // Check if the user has the required permissions to ban members
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
      await interaction.reply({
        content: BOT_TEXTS.YOU_DON_NOT_HAVE_PERMISSIONS_TO_BAN_A_MEMBER,
        ephemeral: true,
      });
      return;
    }

    // Check if the bot has the required permissions to ban members
    if (
      !interaction.guild.members.me?.permissions.has(
        PermissionFlagsBits.BanMembers,
      )
    ) {
      await interaction.reply({
        content: BOT_TEXTS.I_DON_NOT_HAVE_PERMISSIONS_TO_BAN_A_MEMBER,
        ephemeral: true,
      });
      return;
    }

    const member = interaction.options.getMember('user') as GuildMember;
    const reasonOption = interaction.options.get('reason')?.value;
    const reason =
      typeof reasonOption === 'string' ? reasonOption : 'No reason provided';

    // Check if the member exists
    if (!member) {
      await interaction.reply({
        content: BOT_TEXTS.USER_NOT_FOUND,
        ephemeral: true,
      });
      return;
    }

    const guildOwner = interaction.guild.ownerId;

    // Check if the target member is the guild owner
    if (member.id === guildOwner) {
      await interaction.reply({
        content: BOT_TEXTS.SERVER_OWNER_CANNOT_BE_BANNED,
        ephemeral: true,
      });
      return;
    }

    try {
      // Send a direct message to the member being banned
      await member.send(
        `You've been banished from ${interaction.guild.name}! Reason: ${reason}`,
      );

      // Ban the member from the guild
      await member.ban({ reason });

      // Send a confirmation reply to the command issuer
      await interaction.reply({
        content: `${member.user.tag} ${BOT_TEXTS.HAS_BEEN_BANNED}`,
        ephemeral: true,
      });

      // Log the ban action to the server's log channel
      await this.serverLoggerService.sendLogMessage(
        interaction.guild,
        LogChannelType.LEAVE,
        `${member.user.tag} ${BOT_TEXTS.HAS_BEEN_BANNED}`,
      );
    } catch (error) {
      // Log the error to the console and inform the command issuer
      this.logger.error('Error trying to ban:', error);
      await interaction.reply({
        content: `${BOT_TEXTS.THERE_WAS_AN_ERROR} trying to ban this member.`,
        ephemeral: true,
      });
    }
  }
}
