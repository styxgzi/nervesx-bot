import { Injectable, Logger } from '@nestjs/common';
import {
  Client,
  GuildMember,
  PermissionFlagsBits,
  AuditLogEvent,
  Role,
  Collection,
} from 'discord.js';
import { SecurityService } from './Security';
import { PunishmentService } from './Punishment';
import {
  LOG_CHANNELS_NAMES,
  LOG_CHANNELS_SCHEMA_MAPPING,
} from 'src/constants/strings';

@Injectable()
export class MemberUpdateService {
  private readonly logger = new Logger(MemberUpdateService.name);
  constructor(
    private readonly securityService: SecurityService,
    private readonly punishmentService: PunishmentService,
  ) {}
  jailLogChannelId = '';

  async handleGuildMemberUpdate(
    oldMember: GuildMember,
    newMember: GuildMember,
    client: Client,
  ) {
    this.logger.log(`Handling update for member: ${newMember.user.tag}`);

    try {
      // Extract role IDs from both oldMember and newMember
      const oldRoles = oldMember.roles.cache.map((role) => role.id).sort();
      const newRoles = newMember.roles.cache.map((role) => role.id).sort();


      // TODO: Revisit this revert role logic for removal of old roles
      // Check if the roles have actually been updated
      if (JSON.stringify(oldRoles) !== JSON.stringify(newRoles)) {
        const newRoles = newMember.roles.cache.filter(
          (role) => !oldMember.roles.cache.has(role.id),
        );

        await this.handleRoleUpdate(newMember, newRoles, client);
      } else {
        this.logger.log(
          `No role changes for ${newMember.user.tag}, doing nothing.`,
        );
      }
    } catch (error) {
      this.logger.error(`Error handling guild member update: ${error.message}`);
    }
  }

  async handleRoleUpdate(
    member: GuildMember,
    newRoles: Collection<string, Role>,
    client: Client,
  ) {
    try {
      this.logger.log(`Roles updated for member: ${member.user.tag}`);

      const auditLogs = await member.guild.fetchAuditLogs({
        type: AuditLogEvent.MemberRoleUpdate,
      });
      const roleUpdateLog = auditLogs.entries.first();

      // Check if the role update is done by the bot itself
      if (roleUpdateLog && roleUpdateLog.executor.id === client.user.id) {
        this.logger.log(`Role update executed by the bot, ignoring.`);
        return; // Exit the function early as the bot is the executor
      }

      // Check if the role update executor is allowed to assign roles
      const isUserWhitelisted = await this.securityService.isSuperUser(
        roleUpdateLog.executor.id,
        member.guild.id,
      );

      for (const [, role] of newRoles) {
        let unauthorized = false;
        const isDangerousRole = await this.securityService.isDangerousRole(
          role,
          member.guild.id,
        );

        if (isDangerousRole) {
          if (roleUpdateLog && !isUserWhitelisted) {
            this.logger.warn(
              `Unauthorized dangerous role assigned to ${member.user.tag}`,
            );
            unauthorized = true;
          }
        }
        // If an unauthorized role assignment is detected, attempt to reverse it
        if (unauthorized) {
          try {
            if (
              roleUpdateLog &&
              !isUserWhitelisted &&
              member.guild.ownerId !== roleUpdateLog.executor.id
            ) {
              this.logger.warn(
                `Role update by unauthorized user: ${roleUpdateLog.executor.tag}`,
              );

              const isAffectedUserWhitelisted =
                await this.securityService.isSuperUser(
                  member.id,
                  member.guild.id,
                );

              if (!isAffectedUserWhitelisted) {
                // If executor is not whitelisted, remove all roles and jail the member
                await this.punishmentService.jailUser(
                  member.guild.id,
                  member.id,
                  client,
                  LOG_CHANNELS_SCHEMA_MAPPING[LOG_CHANNELS_NAMES.JAIL_LOG],
                  'Jailed for assigning unauthorized role',
                );
              }
            }

            // Revert the changes
            await this.assignRole(
              member.guild.id,
              client.user.id,
              member.id,
              role.name,
              client,
              true,
            );
            await this.punishmentService.jailUser(
              member.guild.id,
              roleUpdateLog.executor.id,
              client,
              LOG_CHANNELS_SCHEMA_MAPPING[LOG_CHANNELS_NAMES.JAIL_LOG],
              'Jailed for assigning unauthorized role',
            );
          } catch (reversalError) {
            this.logger.error(
              `Error reversing role assignment: ${reversalError.message}`,
            );
          }
        }
      }
    } catch (err) {
      throw new Error('Error in handling role update!');
    }
  }

  // Function to assign roles
  async assignRole(
    guildId: string,
    assignerId: string,
    targetUserId: string,
    roleName: string,
    client: Client,
    removeRole: boolean = false,
  ): Promise<void> {
    try {
      const guild = await client.guilds.fetch(guildId);
      const assigner = await guild.members.fetch(assignerId);
      const targetUser = await guild.members.fetch(targetUserId);
      const roleToAssign = guild.roles.cache.find(
        (role) => role.name === roleName,
      );

      if (!roleToAssign) throw new Error('Role not found');

      if (removeRole) {
        // Remove the role
        await targetUser.roles.remove(roleToAssign);
        this.logger.log(
          `Role ${roleName} removed from ${targetUserId} by ${assigner.user.tag}`,
        );
      } else {
        // Assign the role
        await targetUser.roles.add(roleToAssign);
        this.logger.log(
          `Role ${roleName} assigned to ${targetUserId} by ${assigner.user.tag}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error modifying role: ${error.message}`);
    }
  }
}
