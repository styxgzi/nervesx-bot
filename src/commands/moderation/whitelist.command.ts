// timeout.command.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  CommandInteraction,
  GuildMember,
  Message,
  PermissionFlagsBits,
  Role,
  User,
} from 'discord.js';
import { HelperService } from 'lib/classes/Helper';
import { SecurityService } from 'lib/classes/Security';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';
import { ServerRepository } from 'lib/repository/server.repository';
import { BOT_COMMANDS } from 'src/constants/strings';

@Injectable()
export class WhitelistCommandService {
  constructor(
    private readonly securityService: SecurityService,
    private readonly serverLoggerService: ServerLoggerService,
    private readonly serverRepository: ServerRepository,
    private readonly helperService: HelperService,
  ) {}
  private readonly logger = new Logger(WhitelistCommandService.name);

  async executeText(message: Message, args: string[], actionName: string) {
    try {
      // Check if the message member has the permission to timeout members
      const isOwner = message.guild.ownerId === message.author.id;
      const server = await this.serverRepository.findGuildById(
        message.guild.id,
      );
      const isSecondOwner = (server.secondOwners || ([] as any)).includes(
        message.author.id,
      );
      if (!isOwner && !isSecondOwner) {
        const botMessage = await message.reply(
          `Insufficient Permissions: You are not authorized to whitelist members. Please contact your server administrator if you need this ability.`,
        );
        return await this.helperService.deleteLastBotMessageAfterInterval(
          botMessage,
        );
      }

      // Parsing arguments
      // const memberToWhitelist = message.mentions.members.first();
      const roleToWhitelist = await this.helperService.extractRole(message);
      const memberToWhitelist = await this.helperService.extractUser(message);
      let userId = !memberToWhitelist && args[0].replace(/\D/g, ''); // Extract ID from mention or use direct input
      switch (actionName) {
        case BOT_COMMANDS.WHITELIST:
          await this.whiteListUser(message, memberToWhitelist, userId);
          break;

        case BOT_COMMANDS.UN_WHITELIST:
          await this.unWhiteList(message, memberToWhitelist, userId);
          break;

        case BOT_COMMANDS.ADD_ADMIN:
          await this.addAdmin(message, memberToWhitelist, userId);
          break;

        case BOT_COMMANDS.ADD_MOD:
          await this.addModUser(message, memberToWhitelist, userId);
          break;
        case BOT_COMMANDS.REMOVE_ADMIN:
          await this.removeAdminUser(message, memberToWhitelist, userId);
          break;
        case BOT_COMMANDS.REMOVE_MOD:
          await this.removeModUser(message, memberToWhitelist, userId);
          break;

        case BOT_COMMANDS.ADD_ADMIN_ROLE:
          await this.addAdminRole(message, roleToWhitelist, roleToWhitelist.id);
          break;

        case BOT_COMMANDS.ADD_MOD_ROLE:
          await this.addModRole(message, roleToWhitelist, roleToWhitelist.id);
          break;
        case BOT_COMMANDS.REMOVE_ADMIN_ROLE:
          await this.removeAdminRole(message, roleToWhitelist, roleToWhitelist.id);
          break;
        case BOT_COMMANDS.REMOVE_MOD_ROLE:
          await this.removeModRole(message, roleToWhitelist, roleToWhitelist.id);
          break;
      }
    } catch (error) {
      this.logger.error(error);
      const botMessage = await message.reply(
        `Error occurred during whitelist.`,
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }
  }

  async whiteListUser(
    message: Message,
    memberToWhitelist: User,
    userId: string,
  ) {
    const isUserToWhiteListIsWhitelisted =
      await this.securityService.isUserWhitelisted(
        memberToWhitelist ? memberToWhitelist.id : userId,
        message.guild.id,
      );
    if (isUserToWhiteListIsWhitelisted) {
      const botMessage = await message.reply(
        `${
          memberToWhitelist ? memberToWhitelist.tag : userId
        } is already whitelisted`,
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }
    const isWhiteListed = await this.securityService.addUserToServerWhitelist(
      memberToWhitelist ? memberToWhitelist.id : userId,
      message.guild.id,
    );

    if (!isWhiteListed) {
      const botMessage = await message.reply(
        `Unable to whitelist ${
          memberToWhitelist ? memberToWhitelist.tag : userId
        }!`,
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }
    const botMessage = await message.reply(
      `${
        memberToWhitelist ? memberToWhitelist.tag : userId
      } has been Whitelisted!`,
    );
    await this.helperService.deleteLastBotMessageAfterInterval(botMessage);
    await this.serverLoggerService.sendLogMessage(
      message.guild,
      LogChannelType.MODERATOR,
      `${
        memberToWhitelist ? memberToWhitelist.tag : userId
      } has been Whitelisted!`,
    );
  }

  async addAdmin(message: Message, memberToWhitelist: User, userId: string) {
    const isAdminUser = await this.securityService.isAdminUser(
      memberToWhitelist ? memberToWhitelist.id : userId,
      message.guild.id,
    );
    if (isAdminUser) {
      const botMessage = await message.reply(
        `${
          memberToWhitelist ? memberToWhitelist.tag : userId
        } is already an Admin`,
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }
    const isWhiteListed = await this.securityService.addAdminUser(
      memberToWhitelist ? memberToWhitelist.id : userId,
      message.guild.id,
    );

    if (!isWhiteListed) {
      const botMessage = await message.reply(
        `Unable to add Admin ${
          memberToWhitelist ? memberToWhitelist.tag : userId
        }!`,
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }
    const botMessage = await message.reply(
      `${
        memberToWhitelist ? memberToWhitelist.tag : userId
      } has been added as Admin!`,
    );
    await this.helperService.deleteLastBotMessageAfterInterval(botMessage);
    await this.serverLoggerService.sendLogMessage(
      message.guild,
      LogChannelType.MODERATOR,
      `${
        memberToWhitelist ? memberToWhitelist.tag : userId
      } has been added as Admin!`,
    );
  }

  async addModRole(message: Message, roleToWhitelist: Role, roleId: string) {
    const isModeratorRole = await this.securityService.isModeratorRole(
      roleToWhitelist ? roleToWhitelist.id : roleId,
      message.guild.id,
    );
    if (isModeratorRole) {
      const botMessage = await message.reply(
        `${
          roleToWhitelist ? roleToWhitelist.id : roleId
        } is already an Moderator`,
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }
    const isModRole = await this.securityService.addModRole(
      roleToWhitelist ? roleToWhitelist.id : roleId,
      message.guild.id,
    );

    if (!isModRole) {
      const botMessage = await message.reply(
        `Unable to add Moderator ${
          roleToWhitelist ? roleToWhitelist.id : roleId
        }!`,
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }
    const botMessage = await message.reply(
      `${
        roleToWhitelist ? roleToWhitelist.id : roleId
      } has been added as Moderator!`,
    );
    await this.helperService.deleteLastBotMessageAfterInterval(botMessage);
    await this.serverLoggerService.sendLogMessage(
      message.guild,
      LogChannelType.MODERATOR,
      `${
        roleToWhitelist ? roleToWhitelist.id : roleId
      } has been added as Moderator!`,
    );
  }
  async addAdminRole(message: Message, roleToWhitelist: Role, roleId: string) {
    const isAdminUser = await this.securityService.isAdminUser(
      roleToWhitelist ? roleToWhitelist.id : roleId,
      message.guild.id,
    );
    if (isAdminUser) {
      const botMessage = await message.reply(
        `${roleToWhitelist ? roleToWhitelist : roleId} is already an Admin`,
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }
    const isAdminRole = await this.securityService.addAdminRole(
      roleToWhitelist ? roleToWhitelist.id : roleId,
      message.guild.id,
    );

    if (!isAdminRole) {
      const botMessage = await message.reply(
        `Unable to add Admin ${
          roleToWhitelist ? roleToWhitelist.name : roleId
        }!`,
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }
    const botMessage = await message.reply(
      `${
        roleToWhitelist ? roleToWhitelist.name : roleId
      } has been added as Admin!`,
    );
    await this.helperService.deleteLastBotMessageAfterInterval(botMessage);
    await this.serverLoggerService.sendLogMessage(
      message.guild,
      LogChannelType.MODERATOR,
      `${
        roleToWhitelist ? roleToWhitelist.name : roleId
      } has been added as Admin!`,
    );
  }

  async addModUser(message: Message, memberToWhitelist: User, userId: string) {
    const isModeratorUser = await this.securityService.isModeratorUser(
      memberToWhitelist ? memberToWhitelist.id : userId,
      message.guild.id,
    );
    if (isModeratorUser) {
      const botMessage = await message.reply(
        `${
          memberToWhitelist ? memberToWhitelist.tag : userId
        } is already an Moderator`,
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }
    const isWhiteListed = await this.securityService.addModUser(
      memberToWhitelist ? memberToWhitelist.id : userId,
      message.guild.id,
    );

    if (!isWhiteListed) {
      const botMessage = await message.reply(
        `Unable to add Moderator ${
          memberToWhitelist ? memberToWhitelist.tag : userId
        }!`,
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }
    const botMessage = await message.reply(
      `${
        memberToWhitelist ? memberToWhitelist.tag : userId
      } has been added as Moderator!`,
    );
    await this.helperService.deleteLastBotMessageAfterInterval(botMessage);
    await this.serverLoggerService.sendLogMessage(
      message.guild,
      LogChannelType.MODERATOR,
      `${
        memberToWhitelist ? memberToWhitelist.tag : userId
      } has been added as Moderator!`,
    );
  }

  async removeAdminUser(
    message: Message,
    memberToWhitelist: User,
    userId: string,
  ) {
    const isAdminUser = await this.securityService.isAdminUser(
      memberToWhitelist ? memberToWhitelist.id : userId,
      message.guild.id,
    );
    if (!isAdminUser) {
      const botMessage = await message.reply(
        `${memberToWhitelist ? memberToWhitelist.tag : userId} is not an Admin`,
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }
    const isWhiteListed = await this.securityService.removeAdminUser(
      memberToWhitelist ? memberToWhitelist.id : userId,
      message.guild.id,
    );

    if (!isWhiteListed) {
      const botMessage = await message.reply(
        `Unable to remove from Admin ${
          memberToWhitelist ? memberToWhitelist.tag : userId
        }!`,
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }
    const botMessage = await message.reply(
      `${
        memberToWhitelist ? memberToWhitelist.tag : userId
      } has been removed from Admin!`,
    );
    await this.helperService.deleteLastBotMessageAfterInterval(botMessage);
    await this.serverLoggerService.sendLogMessage(
      message.guild,
      LogChannelType.MODERATOR,
      `${
        memberToWhitelist ? memberToWhitelist.tag : userId
      } has been removed from Admin!`,
    );
  }

  async removeModUser(
    message: Message,
    memberToWhitelist: User,
    userId: string,
  ) {
    const isModeratorUser = await this.securityService.isModeratorUser(
      memberToWhitelist ? memberToWhitelist.id : userId,
      message.guild.id,
    );
    if (!isModeratorUser) {
      const botMessage = await message.reply(
        `${
          memberToWhitelist ? memberToWhitelist.tag : userId
        } is not an Moderator`,
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }
    const isWhiteListed = await this.securityService.removeModUser(
      memberToWhitelist ? memberToWhitelist.id : userId,
      message.guild.id,
    );

    if (!isWhiteListed) {
      const botMessage = await message.reply(
        `Unable to remove from Moderator ${
          memberToWhitelist ? memberToWhitelist.tag : userId
        }!`,
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }
    const botMessage = await message.reply(
      `${
        memberToWhitelist ? memberToWhitelist.tag : userId
      } has been removed from Moderator!`,
    );
    await this.helperService.deleteLastBotMessageAfterInterval(botMessage);
    await this.serverLoggerService.sendLogMessage(
      message.guild,
      LogChannelType.MODERATOR,
      `${
        memberToWhitelist ? memberToWhitelist.tag : userId
      } has been removed from Moderator!`,
    );
  }
  async removeAdminRole(
    message: Message,
    roleToWhitelist: Role,
    roleId: string,
  ) {
    const isAdminUser = await this.securityService.isAdminRole(
      roleToWhitelist ? roleToWhitelist.id : roleId,
      message.guild.id,
    );
    if (!isAdminUser) {
      const botMessage = await message.reply(
        `${roleToWhitelist ? roleToWhitelist.id : roleId} is not an Admin Role`,
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }
    const isWhiteListed = await this.securityService.removeAdminRole(
      roleToWhitelist ? roleToWhitelist.id : roleId,
      message.guild.id,
    );

    if (!isWhiteListed) {
      const botMessage = await message.reply(
        `Unable to remove from Admin ${
          roleToWhitelist ? roleToWhitelist.id : roleId
        }!`,
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }
    const botMessage = await message.reply(
      `${
        roleToWhitelist ? roleToWhitelist.id : roleId
      } has been removed from Admin!`,
    );
    await this.helperService.deleteLastBotMessageAfterInterval(botMessage);
    await this.serverLoggerService.sendLogMessage(
      message.guild,
      LogChannelType.MODERATOR,
      `${
        roleToWhitelist ? roleToWhitelist.id : roleId
      } has been removed from Admin!`,
    );
  }

  async removeModRole(message: Message, roleToWhitelist: Role, roleId: string) {
    const isModeratorUser = await this.securityService.isModeratorRole(
      roleToWhitelist ? roleToWhitelist.id : roleId,
      message.guild.id,
    );
    if (!isModeratorUser) {
      const botMessage = await message.reply(
        `${
          roleToWhitelist ? roleToWhitelist.id : roleId
        } is not an Moderator Role`,
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }
    const isWhiteListed = await this.securityService.removeModRole(
      roleToWhitelist ? roleToWhitelist.id : roleId,
      message.guild.id,
    );

    if (!isWhiteListed) {
      const botMessage = await message.reply(
        `Unable to remove from Moderator ${
          roleToWhitelist ? roleToWhitelist.id : roleId
        }!`,
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
      );
    }
    const botMessage = await message.reply(
      `${
        roleToWhitelist ? roleToWhitelist.id : roleId
      } has been removed from Moderator!`,
    );
    await this.helperService.deleteLastBotMessageAfterInterval(botMessage);
    await this.serverLoggerService.sendLogMessage(
      message.guild,
      LogChannelType.MODERATOR,
      `${
        roleToWhitelist ? roleToWhitelist.id : roleId
      } has been removed from Moderator!`,
    );
  }

  async unWhiteList(message: Message, memberToWhitelist: User, userId: string) {
    try {
      const isUserToWhiteListIsWhitelisted =
        await this.securityService.isUserWhitelisted(
          memberToWhitelist ? memberToWhitelist.id : userId,
          message.guild.id,
        );
      if (!isUserToWhiteListIsWhitelisted) {
        const botMessage = await message.reply(
          `${
            memberToWhitelist ? memberToWhitelist.tag : userId
          } is not whitelisted`,
        );
        return await this.helperService.deleteLastBotMessageAfterInterval(
          botMessage,
        );
      }
      await this.securityService.removeUserFromServerWhitelist(
        memberToWhitelist ? memberToWhitelist.id : userId,
        message.guild.id,
      );

      const botMessage = await message.reply(
        `${
          memberToWhitelist ? memberToWhitelist.tag : userId
        } has been removed from whitelisted list!`,
      );
      await this.helperService.deleteLastBotMessageAfterInterval(botMessage);
      await this.serverLoggerService.sendLogMessage(
        message.guild,
        LogChannelType.MODERATOR,
        `${
          memberToWhitelist ? memberToWhitelist.tag : userId
        } has been removed from whitelisted list!`,
      );
    } catch (error) {
      this.logger.error(error);
      const botMessage = await message.reply(
        `Error occurred during remove whitelist member.`,
      );
      await this.helperService.deleteLastBotMessageAfterInterval(botMessage);
    }
  }
}
