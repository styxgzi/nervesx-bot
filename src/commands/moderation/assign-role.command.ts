import { Injectable, Logger } from '@nestjs/common';
import {
  CommandInteraction,
  GuildMember,
  Message,
  PermissionFlagsBits,
  PermissionsBitField,
} from 'discord.js';
import { HelperService } from 'lib/classes/Helper';
import { SecurityService } from 'lib/classes/Security';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';
import { ServerRepository } from 'lib/repository/server.repository';

@Injectable()
export class RoleAssignmentService {
  constructor(
    private readonly serverLoggerService: ServerLoggerService,
    private readonly helperService: HelperService,
    private readonly serverRepository: ServerRepository,
    private readonly securityService: SecurityService,
  ) {}
  private readonly logger = new Logger(RoleAssignmentService.name);

  async executeText(
    message: Message,
    args: string[],
    action: 'assign' | 'unassign',
  ): Promise<void> {
    // Permission check for the command issuer
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)
    ) {
      await message.reply("You don't have permission to assign roles.");
      return;
    }

    if (args.length < 2) {
      await message.reply('Usage: command @User RoleName');
      return;
    }

    const targetUser = await this.helperService.extractUser(message);
    let role = await this.helperService.extractRole(message);

    // Try to resolve the role by name if not found
    if (!role) {
      const roleName = args.slice(1).join(' '); // Assuming the role name can be multiple words
      role = message.guild.roles.cache.find(
        (r) => r.name.toLowerCase() === roleName.toLowerCase(),
      );
    }

    if (!targetUser) {
      await message.reply('Please mention a valid user.');
      return;
    }

    if (!role) {
      await message.reply(`Role "${args.slice(1).join(' ')}" not found.`);
      return;
    }

    const guildMember = message.guild.members.cache.get(targetUser.id);
    const isDangerousRole = await this.securityService.isDangerousRole(
      role,
      message.guild.id,
    );

    if (isDangerousRole) {
      const guildSecurityDetails =
        await this.serverRepository.getServerSecurityDetails(message.guildId);
      const isSpecialPermission =
        guildSecurityDetails.whitelistedUserIds.includes(message.member.id) ||
        message.member.id === message.guild.ownerId ||
        guildSecurityDetails.secondOwners.includes(message.member.id);

      if (!isSpecialPermission) {
        await message.reply(
          'You do not have the required permissions to assign this role.',
        );
        return;
      }
    }

    if (message.member.roles.highest.comparePositionTo(role) <= 0) {
      await message.reply(
        'Your highest role is not high enough to manage this role.',
      );
      return;
    }

    const botMember = await message.guild.members.fetch(message.client.user.id);

    if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      await message.reply("I don't have permission to assign roles.");
      return;
    }

    if (botMember.roles.highest.comparePositionTo(role) <= 0) {
      await message.reply(
        'My highest role is not high enough to assign this role.',
      );
      return;
    }

    try {
      if (action === 'assign') {
        await guildMember.roles.add(role);
        await message.reply(
          `Role "${role.name}" has been assigned to ${targetUser.tag}.`,
        );
      } else {
        await guildMember.roles.remove(role);
        await message.reply(
          `Role "${role.name}" has been removed from ${targetUser.tag}.`,
        );
      }
      await this.serverLoggerService.sendLogMessage(
        message.guild,
        LogChannelType.MODERATOR,
        `Role "${role.name}" has been ${
          action === 'assign' ? 'assigned' : 'removed'
        } to/from ${targetUser.tag}.`,
      );
    } catch (error) {
      this.logger.error(`Failed to assign role: ${error}`);
      await message.reply('Failed to assign the role. Please try again.');
    }
  }
}
