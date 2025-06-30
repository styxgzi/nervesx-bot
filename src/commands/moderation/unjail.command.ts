import { Injectable, Logger } from '@nestjs/common';
import {
  CommandInteraction,
  EmbedBuilder,
  GuildMember,
  Message,
  PermissionFlagsBits,
} from 'discord.js';
import { EmbedOptions, HelperService } from 'lib/classes/Helper';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';
import { JailedUserRepository } from 'lib/repository/jailed-user.repository';
import { ServerRepository } from 'lib/repository/server.repository';
import { BOT_ROLES } from 'src/constants/strings';

export const data = {
  name: 'unjail',
  description: 'Release a member from jail',
  // ... other command details
};

@Injectable()
export class UnJailCommandService {
  private readonly logger = new Logger(UnJailCommandService.name);

  constructor(
    private readonly serverLoggerService: ServerLoggerService,
    private readonly jailedUserRepository: JailedUserRepository,
    private readonly serverRepository: ServerRepository,
    private readonly helperService: HelperService,
  ) {}

  async executeText(message: Message, args: string[]) {
    try {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return await this.sendTemporaryMessage(
          message,
          'Seems like you don’t have the handcuffs to unjail members. 🚨',
        );
      }

      const guildSecurityDetails =
        await this.serverRepository.getServerSecurityDetails(message.guildId);
      if (
        !guildSecurityDetails.whitelistedUserIds.includes(message.member.id) &&
        !guildSecurityDetails.secondOwners.includes(message.member.id) &&
        !guildSecurityDetails.adminIds.includes(message.member.id) &&
        guildSecurityDetails.owner !== message.member.id
      ) {
        return await this.sendTemporaryMessage(
          message,
          'Sorry, you need to be on the Whitelisted list to unjail someone.',
        );
      }

      const roleName = BOT_ROLES.JAIL_ROLE_NAME;
      const guildRoles = message.guild.roles.cache;
      const jailRole = guildRoles.find((role) => role.name === roleName);

      if (!jailRole) {
        return await this.sendTemporaryMessage(
          message,
          `Someone stole the '${BOT_ROLES.JAIL_ROLE_NAME}' role! Can't unjail without it.`,
        );
      }

      const botMember = message.guild.members.cache.get(message.client.user.id);
      if (botMember.roles.highest.position <= jailRole.position) {
        return await this.sendTemporaryMessage(
          message,
          "Oops! I can't reach the jail role. It's higher than my top role. Can we rearrange the hierarchy?",
        );
      }

      const memberToUnJail = message.mentions.members.first();
      if (!memberToUnJail) {
        return await this.sendTemporaryMessage(
          message,
          'Oops! Looks like you forgot to mention someone. Who do we need to unjail? 🗝️',
        );
      }

      if (
        guildSecurityDetails.whitelistedUserIds.includes(memberToUnJail.id) &&
        !guildSecurityDetails.secondOwners.includes(message.member.id) &&
        guildSecurityDetails.owner !== message.member.id
      ) {
        return await this.sendTemporaryMessage(
          message,
          'You can’t unjail someone with a get-out-of-jail-free card [Whitelisted user]!',
        );
      }

      await memberToUnJail.roles.remove(jailRole);
      this.serverLoggerService.sendLogMessage(
        message.guild,
        LogChannelType.MODERATOR,
        `${memberToUnJail.user.tag} has been released from jail. 🚔`,
      );

      const previousRoleIds = await this.retrievePreviousRoleIds(
        memberToUnJail.id,
        message.guild.id,
      );

      const validRoleIds = previousRoleIds.filter((roleId) =>
        message.guild.roles.cache.has(roleId),
      );

      const reAddedRoles = [];
      for (const roleId of validRoleIds) {
        const roleToAdd = message.guild.roles.cache.get(roleId);

        if (!roleToAdd) {
          this.logger.warn(
            `Whoops! I couldn't find the role ${roleId} in this server. Did it escape? 🕵️‍♂️`,
          );
          continue;
        }

        if (botMember.roles.highest.comparePositionTo(roleToAdd) <= 0) {
          this.logger.warn(
            `Yikes! I can't manage the role ${roleToAdd.name} because it's out of my reach. Can we adjust the role hierarchy? 📊`,
          );
          continue;
        }

        try {
          await memberToUnJail.roles.add(roleToAdd);
          reAddedRoles.push(roleToAdd.name);
        } catch (addRoleError) {
          this.logger.error(
            `Trying to give ${roleToAdd.name} to ${memberToUnJail.user.tag} but stumbled: ${addRoleError} 🤕`,
          );
        }
      }

      const embed: EmbedOptions = {
        title: `👮🏻‍♂️ User Bailed`,
        author: {
          name: message.guild.name,
          iconURL: message.guild.iconURL(),
          url: message.guild.iconURL(),
        },
        description: '',
        fields: [
          {
            name: 'Member Freed',
            value: `${memberToUnJail.user.tag} has been released back into the wild. 🌍`,
          },
          {
            name: 'Restored Roles',
            value:
              reAddedRoles.length > 0
                ? reAddedRoles.join(', ')
                : 'No roles were brought back. Either there were errors, or I don’t have the power. 🔧',
          },
        ],
        color: '#00BFFF',
        timestamp: new Date(),
        thumbnailURL: memberToUnJail.user.displayAvatarURL(),
      };

      const botMessage = await message.reply({
        embeds: [this.helperService.createEmbed(embed)],
      });

      await this.helperService.deleteLastBotMessageAfterInterval(botMessage);

      if (previousRoleIds && previousRoleIds.length > 0) {
        await this.jailedUserRepository.remove(
          memberToUnJail.id,
          message.guild.id,
        );
      }
    } catch (error) {
      this.logger.error('Error executing unjail command:', error);
      await this.sendTemporaryMessage(
        message,
        'There was an error trying to unjail the member. Please try again later.',
      );
    }
  }

  async retrievePreviousRoleIds(
    memberId: string,
    guildId: string,
  ): Promise<string[]> {
    try {
      return await this.jailedUserRepository.retrievePreviousRoles(
        memberId,
        guildId,
      );
    } catch (error) {
      this.logger.error(
        'Ran into a snag fetching those previous roles. Here’s what went wrong: ' +
          error,
      );
      throw error;
    }
  }

  private async sendTemporaryMessage(
    message: Message,
    content: string,
  ): Promise<void> {
    const botReply = await message.reply(content);
    await this.helperService.deleteLastBotMessageAfterInterval(botReply);
  }
}
