import { Injectable } from '@nestjs/common';
import { channel } from 'diagnostics_channel';
import {
  ChannelType,
  EmbedBuilder,
  GuildMember,
  Message,
  TextChannel,
} from 'discord.js';
import { ServerRepository } from 'lib/repository/server.repository';
import { EMPTY } from 'rxjs';

@Injectable()
export class WelcomeService {
  constructor(private readonly serverRepository: ServerRepository) {}
  async handleWelcome(member: GuildMember) {
    if (!(member instanceof GuildMember) || !member.guild) return;

    const welcomeChannelId =
      await this.serverRepository.getServerWelcomeChannel(member.guild.id);
    const welcomeChannel = member.guild.channels.cache.find(
      (channel) =>
        channel.id === welcomeChannelId &&
        channel.type === ChannelType.GuildText,
    );

    if (!welcomeChannel) {
      console.error(`Welcome channel ${welcomeChannelId} is not found.`);
      return;
    }

    // Embed Message
    // const welcomeEmbed = new EmbedBuilder()
    //   .setColor('#00FF00')
    //   .setTitle(`Welcome to ${member.guild.name} ${member.displayName}`)
    //   .setDescription(
    //     "We're glad to have you here! Feel free to introduce yourself.",
    //   )
      // .addFields(
      //   {
      //     name: 'Rules',
      //     value: 'Please make sure to read the rules in the #rules channel',
      //   },
      //   {
      //     name: 'Info',
      //     value: 'Check out the #info channel to learn more about our server.',
      //   },
      // )
      // .setThumbnail(member.user.displayAvatarURL())
      // .setTimestamp();
    await(welcomeChannel as TextChannel).send({
      content: `Welcome to the server ${member}!`,
      // embeds: [welcomeEmbed],
    });
  }
}
