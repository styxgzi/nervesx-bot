import { Injectable } from '@nestjs/common';
import {
  CommandInteraction,
  GuildMember,
  Message,
  PermissionFlagsBits,
  PermissionsBitField,
} from 'discord.js';
import { SecurityService } from 'lib/classes/Security';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';
import { ServerRepository } from 'lib/repository/server.repository';

@Injectable()
export class KickCommandService {
  constructor(
    private readonly serverLoggerService: ServerLoggerService,
    private readonly securityService: SecurityService,
    private readonly serverRepository: ServerRepository,
  ) {}
  private isIssuerOwner;
  private isIssuerCoOwner;

  async executeMultiKickTextCommand(message: Message, args: string[]) {
    // Check if the message author has kick permissions
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.KickMembers)
    ) {
      message.reply('You do not have permission to kick members.');
      return;
    }

    const guildSecurityDetails =
      await this.serverRepository.getServerSecurityDetails(message.guildId);
    if (
      !guildSecurityDetails.whitelistedUserIds.includes(message.member.id) &&
      !guildSecurityDetails.secondOwners.includes(message.member.id) &&
      !guildSecurityDetails.adminIds.includes(message.member.id) &&
      guildSecurityDetails.owner !== message.member.id
    ) {
      return message.reply(
        'Nope, you can’t kick a VIP member! They have the "Get Out of Jail Free" card.',
      );
    }

    // Check if the bot has kick permissions
    const botMember = message.guild.members.me;
    if (!botMember.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return message.reply('I do not have permission to kick members.');
    }

    const isUserToWhiteListIsWhitelisted =
      await this.securityService.isUserWhitelisted(
        message.member.id,
        message.guild.id,
      );

    if (!isUserToWhiteListIsWhitelisted) {
      return message.reply(
        'Nope, you can’t ban a VIP member! They have the "Get Out of Jail Free" card.',
      );
    }

    // Extract members to kick from mentions and remove duplicates
    const membersToKick = Array.from(
      new Set(message.mentions.members.values()),
    ) as GuildMember[];

    // Determine if the last argument is likely a reason
    let reason = 'No reason provided';
    if (args.length > 0 && !args[args.length - 1].startsWith('<@')) {
      reason = args.pop(); // Extract the last argument as the reason
    }

    if (membersToKick.length === 0) {
      return message.reply('No members specified to kick.');
    }

    this.isIssuerOwner = message.author.id === message.guild.ownerId;
    this.isIssuerCoOwner = guildSecurityDetails.secondOwners.includes(
      message.guild.ownerId,
    );

    const kickResults = [];
    for (const member of membersToKick) {
      if (
        member instanceof GuildMember &&
        member.roles.highest.position < botMember.roles.highest.position
      ) {
        try {
          if (
            !this.isIssuerOwner &&
            !this.isIssuerCoOwner &&
            guildSecurityDetails.whitelistedUserIds.includes(member.id)
          ) {
            return message.reply(
              'Nope, you can’t kick a VIP member! They have the "Get Out of Jail Free" card.',
            );
          }
          await member.kick(reason);
          kickResults.push(
            `User ${member.user.tag} has been sent to the shadow realm! Successfully kicked. Reason: ${reason}`,
          );
        } catch (error) {
          console.error(`Failed to kick ${member.user.tag}`, error);
          kickResults.push(`${member.user.tag} could not be kicked.`);
        }
      } else {
        kickResults.push(
          `Yikes! I can't kick ${member.user.tag} because it's out of my reach. Can we adjust the role hierarchy? 📊`,
        );
      }
    }

    message.channel.send(kickResults.join('\n'));
    await this.serverLoggerService.sendLogMessage(
      message.guild,
      LogChannelType.LEAVE,
      kickResults.join('\n'),
    );
  }
}
