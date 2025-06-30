import { Injectable, Logger } from '@nestjs/common';
import { GuildMember, Message, PermissionFlagsBits, Role } from 'discord.js';
import { ServerRepository } from 'lib/repository/server.repository';

@Injectable()
export class SecurityService {
  constructor(private readonly serverRepository: ServerRepository) {}
  private readonly logger = new Logger(SecurityService.name);

  async addUserToServerWhitelist(
    userId: string,
    serverId: string,
  ): Promise<boolean> {
    return this.serverRepository.addServerWhiteListUser(userId, serverId);
  }

  async addAdminUser(userId: string, serverId: string): Promise<boolean> {
    return this.serverRepository.addAdminUser(userId, serverId);
  }

  async addModUser(userId: string, serverId: string): Promise<boolean> {
    return this.serverRepository.addModUser(userId, serverId);
  }
  async addAdminRole(roleId: string, serverId: string): Promise<boolean> {
    return this.serverRepository.addAdminRole(roleId, serverId);
  }

  async addModRole(roleId: string, serverId: string): Promise<boolean> {
    return this.serverRepository.addModRole(roleId, serverId);
  }

  async removeUserFromServerWhitelist(
    userId: string,
    serverId: string,
  ): Promise<boolean> {
    return this.serverRepository.removeUserFromServerWhitelist(
      userId,
      serverId,
    );
  }

  // Function to check if a user is whitelisted
  async isUserWhitelisted(userId: string, serverId: string): Promise<boolean> {
    const whitelistedUsers =
      await this.serverRepository.getServerWhiteListedUsers(serverId);
    return whitelistedUsers.includes(userId);
  }

  async isSuperUser(userId: string, serverId: string): Promise<boolean> {
    const guildSecurityDetails =
      await this.serverRepository.getServerSecurityDetails(serverId);
    return (
      guildSecurityDetails.whitelistedUserIds.includes(userId) ||
      guildSecurityDetails.secondOwners.includes(userId) ||
      guildSecurityDetails.owner === userId
    );
  }
  async isOfficialAdmin(
    userId: string,
    serverId: string,
    roleId: string[] = [],
  ): Promise<boolean> {
    const { whitelistedUserIds, secondOwners, adminIds, owner, adminRoles } =
      await this.serverRepository.getServerSecurityDetails(serverId);

    const isRoleIdAdmin = roleId.some((role) => adminRoles.includes(role));

    return (
      whitelistedUserIds.includes(userId) ||
      secondOwners.includes(userId) ||
      adminIds.includes(userId) ||
      owner === userId ||
      isRoleIdAdmin
    );
  }

  async canPerformAction(
    executorId: string,
    targetUserId: string,
    serverId: string,
    actionName: string,
    executorRoles: string[] = [],
    targetRoles: string[] = [],
  ): Promise<{ canPerform: boolean; message?: string }> {
    const { secondOwners, adminIds, owner, modRoles, adminRoles } =
      await this.serverRepository.getServerSecurityDetails(serverId);

    const isExecutorOwner = executorId === owner;
    const isExecutorSecondOwner = secondOwners.includes(executorId);
    const isExecutorAdmin =
      adminIds.includes(executorId) ||
      adminRoles.some((role) => executorRoles.includes(role));
    const isExecutorModerator = modRoles.some((role) =>
      executorRoles.includes(role),
    );

    const isTargetOwner = targetUserId === owner;
    const isTargetSecondOwner = secondOwners.includes(targetUserId);
    const isTargetAdmin =
      adminIds.includes(targetUserId) ||
      adminRoles.some((role) => targetRoles.includes(role));
    const isTargetModerator = modRoles.some((role) =>
      targetRoles.includes(role),
    );

    // Owner can perform actions on everyone
    if (isExecutorOwner) {
      return { canPerform: true };
    }

    // Second Owner checks
    if (isExecutorSecondOwner) {
      if (isTargetOwner) {
        return {
          canPerform: false,
          message: `🚫 As a second owner, you cannot ${actionName} the owner.`,
        };
      }
      if (isTargetSecondOwner) {
        return {
          canPerform: false,
          message: `🚫 As a second owner, you cannot ${actionName} another second owner.`,
        };
      }
      return { canPerform: true };
    }

    // Admin checks
    if (isExecutorAdmin) {
      if (isTargetOwner) {
        return {
          canPerform: false,
          message: `🚫 As an admin, you cannot ${actionName} the owner.`,
        };
      }
      if (isTargetSecondOwner) {
        return {
          canPerform: false,
          message: `🚫 As an admin, you cannot ${actionName} a second owner.`,
        };
      }
      if (isTargetAdmin) {
        return {
          canPerform: false,
          message: `🚫 As an admin, you cannot ${actionName} another admin.`,
        };
      }
      return { canPerform: true };
    }

    // Moderator checks
    if (isExecutorModerator) {
      if (
        isTargetOwner ||
        isTargetSecondOwner ||
        isTargetAdmin ||
        isTargetModerator
      ) {
        return {
          canPerform: false,
          message: `🚫 As a moderator, you cannot ${actionName} higher roles or other moderators.`,
        };
      }
      return { canPerform: true };
    }

    // Normal users can't perform any actions
    return {
      canPerform: false,
      message: `🚫 You do not have permission to ${actionName}.`,
    };
  }

  async isOfficialAdminMod(
    userId: string,
    serverId: string,
    roleId: string[] = [],
  ): Promise<boolean> {
    const {
      whitelistedUserIds,
      secondOwners,
      adminIds,
      modIds,
      owner,
      adminRoles,
      modRoles,
    } = await this.serverRepository.getServerSecurityDetails(serverId);

    const isRoleIdAdminMod = roleId.some(
      (role) => adminRoles.includes(role) || modRoles.includes(role),
    );

    return (
      whitelistedUserIds.includes(userId) ||
      secondOwners.includes(userId) ||
      adminIds.includes(userId) ||
      modIds.includes(userId) ||
      owner === userId ||
      isRoleIdAdminMod
    );
  }

  // Function to check if a user is admin
  async isAdminUser(userId: string, serverId: string): Promise<boolean> {
    const adminUsers = await this.serverRepository.getAdminUserIds(serverId);
    return adminUsers.includes(userId);
  }

  // Function to check if a user is mods
  async isModeratorUser(userId: string, serverId: string): Promise<boolean> {
    const modUsers = await this.serverRepository.getModsUserIds(serverId);
    return modUsers.includes(userId);
  }

  async removeAdminUser(userId: string, serverId: string): Promise<boolean> {
    return await this.serverRepository.removeAdminUser(userId, serverId);
  }

  async removeModUser(userId: string, serverId: string): Promise<boolean> {
    return await this.serverRepository.removeModUser(userId, serverId);
  }

  // Function to check if a role is admin
  async isAdminRole(roleId: string, serverId: string): Promise<boolean> {
    const adminRoles = await this.serverRepository.getAdminRoleIds(serverId);
    return adminRoles.includes(roleId);
  }

  // Function to check if a role is mods
  async isModeratorRole(roleId: string, serverId: string): Promise<boolean> {
    const modRoles = await this.serverRepository.getModsRoleIds(serverId);
    return modRoles.includes(roleId);
  }

  async removeAdminRole(roleId: string, serverId: string): Promise<boolean> {
    return await this.serverRepository.removeAdminRole(roleId, serverId);
  }

  async removeModRole(roleId: string, serverId: string): Promise<boolean> {
    return await this.serverRepository.removeModRole(roleId, serverId);
  }

  // Function to check if a role is "dangerous"
  async isDangerousRole(role: Role, serverId: string): Promise<boolean> {
    const dangerousRoles =
      await this.serverRepository.getServerDangerousRoles(serverId); // Define dangerous roles
    return (
      dangerousRoles.includes(role.id) ||
      role.permissions.has(PermissionFlagsBits.Administrator) ||
      role.permissions.has(PermissionFlagsBits.ManageRoles) ||
      role.permissions.has(PermissionFlagsBits.ManageGuild)
    );
  }

  async validateUserPermissions(message: Message): Promise<boolean> {
    const isOwner = message.guild.ownerId === message.author.id;
    const isUserWhitelisted = await this.isUserWhitelisted(
      message.author.id,
      message.guild.id,
    );

    if (!isOwner && !isUserWhitelisted) {
      await message.reply(
        'You do not have permission to configure server settings.',
      );
      return false;
    }

    return true;
  }
}
