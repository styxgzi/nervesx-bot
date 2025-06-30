// invite-tracker.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  Client,
  EmbedBuilder,
  GuildMember,
  Invite,
  Message,
  TextChannel,
} from 'discord.js';
import { EmbedOptions, HelperService } from 'lib/classes/Helper';
import { InviteRepository } from 'lib/repository/invite.repository';

@Injectable()
export class InviteTrackerService {
  private readonly logger = new Logger(InviteTrackerService.name);

  constructor(
    private readonly inviteRepository: InviteRepository,
    private readonly helperService: HelperService,
  ) {}

  async addNewInvite(invite: Invite) {
    await this.inviteRepository.addNewInvite(invite.guild.id, invite);
  }
  async removeInvite(invite: Invite) {
    await this.inviteRepository.removeInvite(invite.guild.id, invite.code);
  }
  async monitorInvite(member: GuildMember) {
    const { guild } = member;
    const newInvites = await guild.invites.fetch();
    const oldInvites = await this.inviteRepository.getAllInvites(guild.id);
    const usedInvite = newInvites.find(
      (invite) => oldInvites.get(invite.code)?.uses < invite.uses,
    );

    if (usedInvite) {
      await this.inviteRepository.updateInviteCount(
        guild.id,
        usedInvite.inviter.id,
        usedInvite.code,
        usedInvite.uses,
      );
      this.logger.log(
        `${member.user.tag} joined using invite code ${usedInvite.code} from ${usedInvite.inviter.tag}`,
      );
    } else {
      this.logger.warn(
        'Member joined without a recognized invite or through an invite not tracked.',
      );
    }
    await this.inviteRepository.setGuildInvites(guild.id, newInvites);
  }

  async initialize(client: Client): Promise<void> {
    client.guilds.cache.forEach(async (guild) => {
      const invites = await guild.invites.fetch();
      await this.inviteRepository.setGuildInvites(guild.id, invites);
    });
  }

  async execute(message: Message, client: Client): Promise<void> {
    return await this.sendTopInvitesEmbed(message, client);
  }

  async sendTopInvitesEmbed(message: Message, client: Client): Promise<void> {
    const guildId = message.guildId;
    const channelId = message.channelId;
    const topInvites = await this.inviteRepository.getTopInvites(guildId);
    
    const embed: EmbedOptions = {
      title: `🏆 Top 10 Invites`,
      author: {
        name: message.guild.name,
        iconURL: message.guild.iconURL(),
        url: message.guild.iconURL(),
      },
      description: 'Here are the top 10 invites based on usage:',
      fields: [],
      color: '#00BFFF',
      timestamp: new Date(),
      thumbnailURL: message.guild.iconURL(),
    };

    topInvites.forEach((invite, index) => {
      embed.fields.push({
        name: `${index + 1}`,
        value: `Invited by: <@${invite.userId}> \n Uses: ${invite.uses}\n Code: ${invite.code}`,
        inline: true,
      });
    });

    const guild = await client.guilds.fetch(guildId);
    const channel = guild.channels.cache.get(channelId) as TextChannel;
    if (channel) {
      const finalEmbed = this.helperService.createEmbed(embed);
      await this.helperService.sendAutoDeleteMessage(message, '', 20000, [
        finalEmbed,
      ]);
    } else {
      this.logger.warn(`Channel ${channelId} not found in guild ${guildId}`);
    }
  }
}
