import { Injectable } from '@nestjs/common';
import { CommandInteraction, Message } from 'discord.js';
import * as Discord from 'discord.js';
import { EmbedOptions, HelperService } from 'lib/classes/Helper';
import { ServerRepository } from 'lib/repository/server.repository';

@Injectable()
export class HelpCommandService {
  constructor(
    private readonly helperService: HelperService,
    private readonly serverRepository: ServerRepository,
  ) {}

  private readonly stagingPrefix = !this.helperService.isProduction()
    ? 'test'
    : '';

  getSelectMenu() {
    return new Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder>().addComponents(
      new Discord.StringSelectMenuBuilder()
        .setCustomId('help-categories')
        .setPlaceholder('Select a category')
        .addOptions([
          {
            label: '🔨 Moderation Commands',
            description: 'Commands for moderating the server',
            value: this.stagingPrefix + 'moderation',
          },
          {
            label: '🛠️ Utility Commands',
            description: 'Useful utility commands',
            value: this.stagingPrefix + 'utility',
          },
          {
            label: '🔒 Security and Automod Commands',
            description: 'Security and Automod Commands',
            value: this.stagingPrefix + 'security',
          },
          {
            label: '🎈 Fun and Interaction Commands',
            description: 'Fun and Interaction Commands',
            value: this.stagingPrefix + 'fun',
          },
          {
            label: '🆘 Help and Information',
            description: 'Help and Information',
            value: this.stagingPrefix + 'help',
          },
        ]),
    );
  }

  async generateMainHelp(interaction: CommandInteraction | Message) {
    const prefix =
      (await this.serverRepository.getServerPrefix(interaction.guildId)) || '!';

    const embed: EmbedOptions = {
      title: `🆘 Help: List of Commands`,
      author: {
        name: interaction.guild.name,
        iconURL: interaction.guild.iconURL(),
        url: interaction.guild.iconURL(),
      },
      description: `Here are the commands you can use, organized by category.\n Use \`${prefix}command [args]\` to execute a command. Arguments enclosed in \`[ ]\` are required, while those in \`()\` are optional.`,
      fields: [
        {
          name: 'Server Prefix',
          value: `\`${prefix}\``,
        },
      ],
      color: '#00BFFF',
      timestamp: new Date(),
      thumbnailURL: interaction.guild.iconURL(),
    };

    const selectMenu = this.getSelectMenu();
    if (interaction instanceof CommandInteraction) {
      await interaction.reply({
        embeds: [this.helperService.createEmbed(embed)],
        components: [selectMenu],
        ephemeral: true,
      });
    } else {
      await interaction.channel.send({
        embeds: [this.helperService.createEmbed(embed)],
        components: [selectMenu],
      });
    }
  }

  getModerationCommandsDescription(prefix: string): string {
    return (
      `\`${prefix}ban [user] [reason]\` - Ban a user from the server.\n` +
      `\`${prefix}kick [user] [reason]\` - Kick a user from the server.\n` +
      `\`${prefix}mute [user] [duration]\` - Mute a user for a specified duration.\n` +
      `\`${prefix}unmute [user]\` - Unmute a user.\n` +
      `\`${prefix}jail [user]\` - Jail a user.\n` +
      `\`${prefix}unjail [user]\` - Release a user from jail.\n` +
      `\`${prefix}timeout [user] [duration in seconds]\` - Timeout a user.\n` +
      `\`${prefix}removetimeout [user]\` - Remove timeout a user.\n` +
      `\`${prefix}warn [user] [reason]\` - Warn a user.\n` +
      `\`${prefix}whitelist [user]\` - Whitelist a user from automod actions.\n` +
      `\`${prefix}unwhitelist [user]\` - Remove whitelisted user from automod actions.\n` +
      `\`${prefix}purge [number]\` - Delete a specified number of messages.\n` +
      `\`${prefix}hackban [user]\` - Hackban a user.\n` +
      `\`${prefix}unban [user]\` - Unban a user.\n` +
      `\`${prefix}lockdown\` - Activate server-wide lockdown.\n` +
      `\`${prefix}unlockdown\` - Deactivate server-wide lockdown.\n` +
      `\`${prefix}vcmoveall [Destination Voice Channel]\` - Move all the users from a vc to another vc.\n` +
      `\`${prefix}role [user] [role]\` - Assign a role to user.\n` +
      `\`${prefix}removerole [user] [role]\` - Remove a role to user.\n` +
      `\`${prefix}rrole [user] [role]\` - Remove a role to user.\n` +
      `\`${prefix}snipe\` - Snipe last 20 deleted messages.\n`
    );
  }

  getUtilityCommandsDescription(prefix: string): string {
    return (
      `\`${prefix}setup\` - Run initial setup for the server.\n` +
      `\`${prefix}avatar [user]\` - Show a user's avatar.\n` +
      `\`${prefix}setnickname [@user] [nickname]\` - Change a user's nickname.\n` +
      `\`${prefix}setchannel [channel] type] \` - Assign a specific channel for bot actions. Types (WELCOME)\n` +
      `\`${prefix}setautorole [role]\` - Set a role to be automatically assigned to new members.\n` +
      `\`${prefix}setprefix [prefix]\` - Change the command prefix for the server.\n` +
      `\`${prefix}setsecondowner [user]\` - Set a second owner for the server.\n` +
      `\`${prefix}setmentionlimit [limit]\` - Restrict the number of user mentions allowed in a single message.\n` +
      `\`${prefix}autovccreate\` - Create Auto Voice Channel Generator.\n` +
      `\`${prefix}avc\` - Create Auto Voice Channel Generator.\n` +
      `\`${prefix}autovoicetemplate [channelId] [template]\` - Set Auto Voice Channel Template. Use any of these template combination \n 1."{username} \n 2.{nickname} \n 3.{date} \n 4. {time} 5.{guildname}   \n` +
      `\`${prefix}avt [channelId] [template]\` - Set Auto Voice Channel Template. Use any of these template combination \n 1."{username} \n 2.{nickname} \n 3.{date} \n 4. {time} 5.{guildname}   \n`
      // `\`${prefix}play [song/link]\` - Play music from YouTube or Spotify.\n`
    );
  }

  getSecurityAndAutoModDescription(prefix: string): string {
    return (
      `\`${prefix}activate-antiraid\` - Activate anti-raid protection.\n` +
      `\`${prefix}deactivate-antiraid\` - Deactivate anti-raid protection.\n` +
      `\`${prefix}lockchannel [channel]\` - Lock a channel, preventing messages.\n` +
      `\`${prefix}unlockchannel [channel]\` - Unlock a channel, allowing messages.\n` +
      `\`${prefix}mediaonly [channel]\` - Set a channel to only allow media messages.\n` +
      `\`${prefix}unsetmediaonly [channel]\` - Remove media-only restrictions from a channel.\n` +
      `\`${prefix}bypassantilink [channel]\` - Allow links in a specific channel.\n` +
      `\`${prefix}unsetbypassantilink [channel]\` - Remove link allowance in a specific channel.\n` +
      `\`${prefix}serverbackup\` - Take backup of the complete server.\n` +
      `\`${prefix}register add [username]\` - Register the user who is allowed to join the server (This is pro feature, Raise a request to get the trial of 3months).\n`
    );
  }

  getFunAndInteractionDescription(prefix: string): string {
    return `\`${prefix}vanity\` - Generate a vanity URL for your profile.\n`;
  }

  getHelpAndInformationDescription(prefix: string): string {
    return (
      `\`${prefix}help\` - Display this help message.\n` +
      `\`${prefix}serverinfo\` - Display information about the server.\n` +
      `\`${prefix}userinfo [user]\` - Display information about a user.\n` +
      `\`${prefix}officials\` - Get the Server Officials Details.\n` +
      `\`${prefix}whitelisted\` - Show the server's Whitelisted Users.\n` +
      `\`${prefix}messagecount [user] (Optional)\` - Get the User message count.\n` +
      `\`${prefix}membercount\` - Show the current server member count.\n` +
      `\`${prefix}mc\` - Show the current server member count.\n` +
      `\`${prefix}topmessages\` - Show the Top 10 member message count.\n` +
      `\`${prefix}logs\` - Show the server's audit logs.\n` +
      `\`${prefix}invites\` - Show the server's top 10 invites.\n`
    );
  }

  async execute(interaction: CommandInteraction) {
    await this.generateMainHelp(interaction);
  }
  async executeText(message: Message, args: string[]) {
    await this.generateMainHelp(message);
  }
}
