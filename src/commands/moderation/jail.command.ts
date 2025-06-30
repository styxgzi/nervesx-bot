import {
  Client,
  CommandInteraction,
  EmbedBuilder,
  GuildMember,
  GuildMemberRoleManager,
  Message,
  PermissionFlagsBits,
} from 'discord.js';
import { Injectable } from '@nestjs/common';
import { EmbedOptions, HelperService } from 'lib/classes/Helper';
import { PunishmentService } from 'lib/classes/Punishment';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';
import { JailedUserRepository } from 'lib/repository/jailed-user.repository';
import { ServerLogChannelRepository } from 'lib/repository/server-log-channel.repository';
import { ServerRepository } from 'lib/repository/server.repository';
import { BOT_ROLES } from 'src/constants/strings';

export const data = {
  name: 'jail',
  description: 'Jail a member',
  // ... other command details
};

@Injectable()
export class JailCommandService {
  constructor(
    private readonly serverLoggerService: ServerLoggerService,
    private readonly jailedUserRepository: JailedUserRepository,
    private readonly punishmentService: PunishmentService,
    private readonly serverLogChannelRepository: ServerLogChannelRepository,
    private readonly serverRepository: ServerRepository,
    private readonly helperService: HelperService,
  ) {}

  async execute(interaction: CommandInteraction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.reply({
        content: 'Oops! It seems like you forgot your keys to the jail cells.',
        ephemeral: true,
      });
      return;
    }

    const roleName = BOT_ROLES.JAIL_ROLE_NAME;
    const guildRoles = interaction.guild.roles.cache;
    const jailRole = guildRoles.find((role) => role.name === roleName);

    if (!jailRole) {
      await interaction.reply({
        content: `Uh-oh, the '${roleName}' role is missing! Did someone escape with it?`,
        ephemeral: true,
      });
      return;
    }

    const memberToJail = interaction.options.getMember('user') as GuildMember;

    if (!memberToJail) {
      await interaction.reply({
        content: 'Who are we jailing today? I need a name!',
        ephemeral: true,
      });
      return;
    }

    const memberRoles = interaction.member.roles as GuildMemberRoleManager;
    const highestRole = memberRoles.highest;

    if (memberToJail.roles.highest.position >= highestRole.position) {
      await interaction.reply({
        content: `You can't jail ${memberToJail.user.tag} because their highest role is equal to or higher than yours.`,
        ephemeral: true,
      });
      return;
    }

    const currentRoles = memberToJail.roles.cache.filter(
      (role) => role.id !== interaction.guild.roles.everyone.id,
    );

    await memberToJail.roles.remove(currentRoles);

    await memberToJail.roles.add(jailRole);

    await interaction.reply({
      content: `${memberToJail.user.tag} has been jailed.`,
      ephemeral: true,
    });
    await this.serverLoggerService.sendLogMessage(
      interaction.guild,
      LogChannelType.LEAVE,
      `${memberToJail.user.tag} has been jailed.`,
    );
  }

  async executeText(message: Message, args: string[], client: Client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      const botMessage = await message.reply(
        'Seems like you don’t have the handcuffs to jail members. 🚨',
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
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
      return await this.helperService.sendAutoDeleteMessage(
        message,
        'Hold up, sheriff! You need a bit more clout to throw folks in jail around here!',
      );
    }

    const roleName = BOT_ROLES.JAIL_ROLE_NAME;
    const guildRoles = message.guild.roles.cache;
    const jailRole = guildRoles.find((role) => role.name === roleName);

    if (!jailRole) {
      const botMessage = await message.reply(
        `Someone stole the '${BOT_ROLES.JAIL_ROLE_NAME}' role! Can't jail without it.`,
      );
      await this.helperService.deleteLastBotMessageAfterInterval(botMessage);
      return;
    }
    const memberToJail = message.mentions.members.first();
    if (!memberToJail) {
      return await this.helperService.sendAutoDeleteMessage(
        message,
        'You gotta point me to the troublemaker to throw them in jail!',
      );
    }

    const memberRoles = message.member.roles;
    const highestRole = memberRoles.highest;

    if (memberToJail.roles.highest.position >= highestRole.position) {
      return await this.helperService.sendAutoDeleteMessage(
        message,
        `You can't jail ${memberToJail.user.tag} because their highest role is equal to or higher than yours.`,
      );
    }

    if (
      guildSecurityDetails.whitelistedUserIds.includes(memberToJail.id) &&
      guildSecurityDetails.whitelistedUserIds.includes(message.author.id) &&
      !guildSecurityDetails.secondOwners.includes(message.author.id) &&
      guildSecurityDetails.owner !== message.author.id
    ) {
      return await this.helperService.sendAutoDeleteMessage(
        message,
        'You can’t jail someone with a get-out-of-jail-free card [Whitelisted user]!',
      );
    }

    if (
      memberToJail.id === guildSecurityDetails.owner &&
      guildSecurityDetails.secondOwners.includes(message.author.id)
    ) {
      return await this.helperService.sendAutoDeleteMessage(
        message,
        'Even with all the keys in the world, you can’t jail the Owner!',
      );
    }

    if (memberToJail.voice.channel) {
      try {
        await memberToJail.voice.disconnect(BOT_ROLES.JAIL_ROLE_NAME);
      } catch (error) {
        console.error(
          `Whoops! Couldn't kick ${memberToJail.user.tag} out of their voice chat party!`,
          error,
        );
        await this.serverLoggerService.sendLogMessage(
          message.guild,
          LogChannelType.LEAVE,
          `Tried to send ${memberToJail.user.tag} to solitary, but they're clinging to the voice channel!`,
        );
        return;
      }
    }

    const freshMember = await memberToJail.guild.members.fetch(memberToJail.id);
    const currentRoles = freshMember.roles.cache.filter(
      (role) => role.id !== freshMember.guild.roles.everyone.id,
    );

    await this.jailedUserRepository.create(
      memberToJail.id,
      message.guild.id,
      currentRoles.map((role) => role.id),
    );
    args.shift();
    const reason = args.join(' ');
    await this.punishmentService.jailUser(
      message.guild.id,
      memberToJail.id,
      client,
      null,
      reason,
    );

    const embed: EmbedOptions = {
      title: `👮🏻‍♂️ Jailed Users`,
      author: {
        name: message.guild.name,
        iconURL: message.guild.iconURL(),
        url: message.guild.iconURL(),
      },
      description: `🎉 Party in the cell! ${memberToJail.user.tag} just got jailed!`,
      fields: [
        {
          name: 'Jailed Users',
          value: memberToJail.user.tag,
        },
      ],
      color: '#00BFFF',
      timestamp: new Date(),
      thumbnailURL: message.guild.iconURL(),
    };

    return await this.helperService.sendAutoDeleteMessage(message, '', 5000, [
      this.helperService.createEmbed(embed),
    ]);
  }

  async jailList(message: Message, args: string[], client: Client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      const botMessage = await message.reply(
        'Seems like you don’t have the handcuffs to jail members. 🚨',
      );
      return await this.helperService.deleteLastBotMessageAfterInterval(
        botMessage,
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
      return await this.helperService.sendAutoDeleteMessage(
        message,
        'Hold up, sheriff! You need a bit more clout to throw folks in jail around here!',
      );
    }
    const jailedUsers = await this.jailedUserRepository.getJailedUsers(
      message.guildId,
    );

    const embed: EmbedOptions = {
      title: `👮🏻‍♂️ Jailed Users`,
      author: {
        name: message.guild.name,
        iconURL: message.guild.iconURL(),
        url: message.guild.iconURL(),
      },
      description: '',
      fields: [
        {
          name: 'Jailed Users',
          value:
            (jailedUsers || [])
              .map((jailedUser) => `<@${jailedUser.memberId}>`)
              .join('\n') || 'None',
        },
      ],
      color: '#00BFFF',
      timestamp: new Date(),
      thumbnailURL: message.guild.iconURL(),
    };
    const botMessage = await message.reply({
      embeds: [this.helperService.createEmbed(embed)],
    });
    return await this.helperService.deleteLastBotMessageAfterInterval(
      botMessage,
      20000,
    );
  }
}
