import { Injectable, Logger } from '@nestjs/common';
import { Message, PermissionsBitField, EmbedBuilder } from 'discord.js';

@Injectable()
export class MemberCountService {
  private readonly logger = new Logger(MemberCountService.name);

  async executeText(message: Message, args: string[]): Promise<void> {
    const guild = message.guild;
    if (!guild) {
      await message.reply('This command can only be used in a guild.');
      return;
    }

    await guild.members.fetch();

    const users = guild.members.cache.filter((member) => !member.user.bot).size;
    const bots = guild.members.cache.filter((member) => member.user.bot).size;
    const mangerRoles = guild.members.cache.filter((member) =>
      member.permissions.has(PermissionsBitField.Flags.ManageRoles),
    ).size;
    const admins = guild.members.cache.filter((member) =>
      member.permissions.has(PermissionsBitField.Flags.Administrator),
    ).size;

    const embed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('Server Member Count')
      .addFields(
        { name: 'Users', value: `${users}`, inline: true },
        { name: 'Bots', value: `${bots}`, inline: true },
        { name: 'Administrators', value: `${admins}`, inline: true },
        { name: 'Manage Roles', value: `${mangerRoles}`, inline: true },
      )
      .setFooter({ text: `Member count for ${guild.name}` })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  }
}
