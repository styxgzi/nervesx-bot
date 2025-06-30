import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelType,
  Client,
  GuildMember,
  messageLink,
  PermissionsBitField,
} from 'discord.js';
import { JailedUserRepository } from 'lib/repository/jailed-user.repository';
import { ServerLogChannelRepository } from 'lib/repository/server-log-channel.repository';
import { BOT_ROLES } from 'src/constants/strings';
import { LogChannelType, ServerLoggerService } from './ServerLogger';
import { EmbedOptions, HelperService } from './Helper';

@Injectable()
export class PunishmentService {
  constructor(
    private readonly jailedUserRepository: JailedUserRepository,
    private readonly serverLogChannelRepository: ServerLogChannelRepository,
    private readonly serverLoggerService: ServerLoggerService,
    private readonly helperService: HelperService,
  ) {}
  private readonly logger = new Logger(PunishmentService.name);

  private readonly JAIL_ROLE_NAME = BOT_ROLES.JAIL_ROLE_NAME;

  async jailUser(
    guildId: string,
    userId: string,
    client: Client,
    logChannelName: string,
    reason: string = '',
  ): Promise<void> {
    try {
      const guild = await client.guilds.fetch(guildId);
      const jailRole = guild.roles.cache.find(
        (role) => role.name === this.JAIL_ROLE_NAME,
      );
      if (!jailRole) {
        this.logger.error('Jail role not found');
        return;
      }

      // Assuming 'client' is your Discord client instance and 'guild' is the Guild instance
      const botMember = await guild.members.fetch(client.user.id);

      if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        console.log('The bot does not have the Manage Roles permission.');
        return;
      }

      if (botMember.roles.highest.position <= jailRole.position) {
        console.log(
          "The bot's highest role is lower than or equal to the jail role, and cannot assign it.",
        );
        return;
      }

      const member = await guild.members.fetch(userId);

      // Store current role (excluding @everyone role)
      const currentRoles = member.roles.cache.filter(
        (role) => role.id !== guild.roles.everyone.id,
      );

      await this.jailedUserRepository.create(
        userId,
        guild.id,
        currentRoles.map((role) => role.id),
      );

      await member.roles.set([jailRole]);
      this.logger.log(`User ${userId} has been jailed`);

      // Send a direct message to the user
      try {
        const botMessage = await member.send(
          `You have been jailed in ${guild.name}.`,
        );
        await this.helperService.deleteLastBotMessageAfterInterval(botMessage);
        this.logger.log(`Message sent to jailed user ${userId}`);
      } catch (dmError) {
        this.logger.error(
          `Error sending DM to jailed user ${userId}: ${dmError.message}`,
        );
      }

      const embed: EmbedOptions = {
        title: `📝 Jail Log`,
        author: {
          name: guild.name,
          iconURL: guild.iconURL(),
          url: guild.iconURL(),
        },
        description: '',
        fields: [
          { name: 'Jailed User', value: `<@${userId}>`, inline: false },
          {
            name: 'Reason',
            value: reason,
            inline: false,
          },
        ],
        color: '#00BFFF',
        timestamp: new Date(),
        thumbnailURL: guild.iconURL(),
      };

      await this.serverLoggerService.sendLogMessage(
        guild,
        LogChannelType.JAIL,
        '',
        this.helperService.createEmbed(embed),
      );
    } catch (error) {
      this.logger.error(`Error jailing user: ${error.message}`);
    }
  }

  async muteMember(member: GuildMember): Promise<void> {
    const mutedRole = member.guild.roles.cache.find(
      (role) => role.name === BOT_ROLES.MUTED_NAME,
    );
    if (!mutedRole) {
      throw new Error('Muted role not found');
    }
    // Server mute the member
    if (!member.voice.serverMute) {
      await member.voice
        .setMute(true, 'Member muted via command')
        .catch((error) => {
          throw new Error(`Failed to server mute: ${error}`);
        });
    }

    await member.roles.add(mutedRole);
  }
}
