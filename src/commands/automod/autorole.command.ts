import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, GuildMember, PermissionsBitField } from 'discord.js';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';
import { ServerRepository } from 'lib/repository/server.repository';

@Injectable()
export class AutoRoleService {
  private readonly logger = new Logger(AutoRoleService.name);

  constructor(
    private readonly serverRepository: ServerRepository,
    private readonly serverLoggerService: ServerLoggerService,
  ) {}

  private async fetchRolesToAssign(guildId: string): Promise<string[]> {
    // Dynamically fetch auto-assign role names from the repository
    try {
      const roles = await this.serverRepository.getAutoRoles(guildId);
      return roles;
    } catch (error) {
      this.logger.error(
        `Failed to fetch auto roles for guild ${guildId}: ${error}`,
      );
      return [];
    }
  }

async handleAutoRole(member: GuildMember,client: Client): Promise<void> {
    const guildId = member.guild.id;
    const autoRoles = await this.fetchRolesToAssign(guildId);

    if (autoRoles.length === 0) {
      this.logger.warn(
        `No auto-assign roles configured for guild '${member.guild.name}' (${guildId}).`,
      );
      return;
    }

    // Fetch the bot's member object in the guild
    const botMember = await member.guild.members.fetch(client.user.id);

    // Check bot permissions
    if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      this.logger.error(
        `Bot lacks 'ManageRoles' permission in guild '${member.guild.name}'.`,
      );
      return;
    }

    const rolesToAssign = autoRoles
      .map((roleName) =>
        member.guild.roles.cache.find((role) => role.name === roleName),
      )
      .filter(
        (role) => role && botMember.roles.highest.position > role.position,
      ); // Ensure bot's highest role is above the roles it needs to assign

    if (rolesToAssign.length === 0) {
      this.logger.warn(
        `Configured roles [${autoRoles.join(
          ', ',
        )}] not found or bot's highest role not above all roles in guild '${
          member.guild.name
        }'.`,
      );
      return;
    }

    try {
      // Assign all fetched roles to the new member
      await member.roles.add(rolesToAssign);
      const message = `Assigned roles [${rolesToAssign
        .map((role) => role.name)
        .join(', ')}] to user '${member.user.tag}' in guild '${
        member.guild.name
      }'.`;
      await this.serverLoggerService.sendLogMessage(
        member.guild,
        LogChannelType.JOIN,
        message,
      );
      this.logger.log(message);
    } catch (error) {
      const message = `Failed to assign roles [${rolesToAssign
        .map((role) => role.name)
        .join(', ')}] to user '${member.user.tag}' in guild '${
        member.guild.name
      }': ${error}`;
      await this.serverLoggerService.sendLogMessage(
        member.guild,
        LogChannelType.JOIN,
        message,
      );
    }
  }
}
