import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Discord from 'discord.js';
import { CommandRegistrationService } from 'src/command-registration/command-registration.service';
import { CommandsService } from '../commands/command.service';
import { AutoModService } from './auto-mod.service';
import { HelperService } from 'lib/classes/Helper';
import { AutoVoiceChannelService } from 'src/commands/features/auto-voice.command';
import { InjectModel } from '@nestjs/mongoose';
import {
  AntiConfig,
  CreateServerType,
  Server,
  ServerDocument,
} from 'lib/models/server.schema';
import { Collection, Model } from 'mongoose';
import { AntiLinkCommandService } from 'src/commands/automod/anit-link.command';
import { WelcomeService } from 'lib/classes/Welcome';
import { MemberUpdateService } from 'lib/classes/MemberUpdate';
import { ServerRepository } from 'lib/repository/server.repository';
import { VanityCommandService } from 'src/commands/intractions/vanity.command';
import { AutoRoleService } from 'src/commands/automod/autorole.command';
import { AntiNukeService } from 'src/commands/automod/aniti-nuke.command';
import { MediaOnlyService } from 'src/commands/features/media.command';
import { BotInteractionService } from 'src/commands/selectInteraction.service';
import { BOT_TEXTS, CHANNEL_ACTION_TYPE } from 'src/constants/strings';
import { ButtonInteractionService } from '../commands/buttonInteration.service';
import { AfkService } from '../commands/features/afk.command';
import { MentionLimitService } from 'src/commands/automod/mention.command';
import { SnipeService } from 'src/commands/moderation/snipe-message.command';
import { SpamDetectionService } from 'src/commands/automod/anity-spam.command';
import { AntiRaidCommand } from 'src/commands/automod/antiraid.command';
import { PingTextCommandService } from 'src/commands/intractions/ping.command';
import { LogChannelType, ServerLoggerService } from 'lib/classes/ServerLogger';
import { Channel } from 'diagnostics_channel';
import { AllowedUsersRepository } from 'lib/repository/registered-user.repository';
import { ModalInteractionService } from 'src/commands/modalInteration.service';
import { DailyMessageCountService } from 'lib/services/MessageCount.service';
import { InviteTrackerService } from 'lib/services/invite-tracker.service';

@Injectable()
export class DiscordBotService implements OnModuleInit {
  private readonly client: Discord.Client;
  private readonly logger = new Logger(DiscordBotService.name);

  constructor(
    private configService: ConfigService,

    private commandsService: CommandsService,
    private commandRegistrationService: CommandRegistrationService,
    private autoModService: AutoModService,
    private helperService: HelperService,
    private autoVoiceChannelService: AutoVoiceChannelService,
    private antiLinkCommandService: AntiLinkCommandService,
    private welcomeService: WelcomeService,
    private memberUpdateService: MemberUpdateService,
    private serverRepository: ServerRepository,
    private vanityCommandService: VanityCommandService,
    private autoRoleService: AutoRoleService,
    private antiNukeService: AntiNukeService,
    private mediaOnlyService: MediaOnlyService,
    private botInteractionService: BotInteractionService,
    private buttonInteractionService: ButtonInteractionService,
    private afkService: AfkService,
    private mentionLimitService: MentionLimitService,
    private snipeService: SnipeService,
    private spamDetectionService: SpamDetectionService,
    private antiRaidCommand: AntiRaidCommand,
    private serverLoggerService: ServerLoggerService,
    private allowedUsersRepository: AllowedUsersRepository,
    private modalInteractionService: ModalInteractionService,
    private dailyMessageCountService: DailyMessageCountService,
    private inviteTrackerService: InviteTrackerService,
  ) {
    // Pass an empty options object to the Discord.Client constructor
    this.client = new Discord.Client({
      intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.GuildMembers,
        Discord.IntentsBitField.Flags.Guilds,
        Discord.IntentsBitField.Flags.MessageContent,
        Discord.IntentsBitField.Flags.GuildMessages,
        Discord.IntentsBitField.Flags.DirectMessages,
        Discord.IntentsBitField.Flags.GuildVoiceStates,
      ],
    });
  }
  onModuleInit() {
    // Bot Events
    this.client.on('ready', this.onReady.bind(this));

    // MESSAGE Events
    this.client.on('messageCreate', this.onMessageCreate.bind(this));
    this.client.on('messageDelete', this.onMessageDelete.bind(this));
    this.client.on('messageUpdate', this.onMessageUpdate.bind(this));

    // INTERACTIONS
    this.client.on('interactionCreate', this.onInteractionCreate.bind(this));

    this.client.on('guildMemberAdd', this.onGuildMemberAdd.bind(this));
    this.client.on('guildMemberRemove', this.guildMemberRemove.bind(this));

    // GUILD EVENTS
    this.client.on('guildCreate', this.onGuildCreate.bind(this));
    this.client.on('guildDelete', this.onGuildDelete.bind(this));
    this.client.on('guildUpdate', this.handleGuildUpdate.bind(this));

    this.client.on('voiceStateUpdate', this.onVoiceStateUpdate.bind(this));

    this.client.on('emojiCreate', this.handleEmojiCreate.bind(this));
    this.client.on('emojiUpdate', this.handleEmojiUpdate.bind(this));
    this.client.on('emojiDelete', this.handleEmojiDelete.bind(this));

    this.client.on('inviteCreate', this.handleInviteCreate.bind(this));
    this.client.on('inviteDelete', this.handleInviteDelete.bind(this));

    //!Danger Events
    this.client.on('channelDelete', this.handleChannelDelete.bind(this));
    this.client.on('roleDelete', this.handleRoleDelete.bind(this));
    this.client.on('guildMemberUpdate', this.onGuildMemberUpdate.bind(this));

    this.client.on('channelCreate', this.handleChannelCreate.bind(this));
    this.client.on('channelDelete', this.handleChannelDelete.bind(this));
    this.client.on('channelUpdate', this.handleChannelUpdate.bind(this));

    this.client.on('roleCreate', this.handleRoleCreate.bind(this));
    this.client.on('roleUpdate', this.handleRoleUpdate.bind(this));
    this.client.on('roleDelete', this.handleRoleDelete.bind(this));

    this.client.on('webhookUpdate', this.handleWebhookUpdate.bind(this));

    this.client.on('guildBanAdd', (ban) => {
      this.handleGuildBanAdd(ban);
      this.logMemberBan(ban);
    });

    this.client.on('guildBanRemove', (ban) => {
      this.handleGuildBanRemove(ban);
      this.logMemberUnban(ban);
    });

    this.client.on('channelDelete', (channel) => {
      this.logChannelDelete(channel);
    });

    this.client.on('roleDelete', async (role) => {
      await this.logRoleDelete(role);
    });

    // Bot Token Login
    const botToken = this.configService.get<string>('DISCORD_BOT_TOKEN');
    this.client.login(botToken);
  }

  private async onGuildMemberUpdate(
    oldMember: Discord.GuildMember,
    newMember: Discord.GuildMember,
  ) {
    this.handleGuildMemberUpdate(oldMember, newMember);
    this.memberUpdateService.handleGuildMemberUpdate(
      oldMember,
      newMember,
      this.client,
    );
  }
  private handleChannelDelete = async (channel: Discord.GuildChannel) => {
    this.antiNukeService.monitorActions(
      channel.guild,
      CHANNEL_ACTION_TYPE.CHANNEL_DELETE,
      this.client,
    );
  };

  private handleRoleDelete = async (channel: Discord.GuildChannel) => {
    this.antiNukeService.monitorActions(
      channel.guild,
      CHANNEL_ACTION_TYPE.ROLE_DELETE,
      this.client,
    );
  };

  private async handleChannelCreate(channel: Discord.GuildChannel) {
    // Implement handling logic
    await this.antiNukeService.monitorActions(
      channel.guild,
      CHANNEL_ACTION_TYPE.CHANNEL_CREATE,
      this.client,
    );
  }

  private async handleChannelUpdate(
    oldChannel: Discord.GuildChannel,
    newChannel: Discord.GuildChannel,
  ) {
    await this.antiNukeService.monitorActions(
      newChannel.guild,
      CHANNEL_ACTION_TYPE.CHANNEL_UPDATE,
      this.client,
    );
  }

  // Implement the rest of the event handlers in a similar fashion
  private async handleGuildMemberAdd(member: Discord.GuildMember) {
    await this.antiNukeService.monitorActions(
      member.guild,
      CHANNEL_ACTION_TYPE.CHANNEL_UPDATE,
      this.client,
    );
  }

  private async handleGuildMemberRemove(member: Discord.GuildMember) {
    await this.antiNukeService.monitorActions(
      member.guild,
      CHANNEL_ACTION_TYPE.MEMBER_BAN_REMOVE,
      this.client,
    );
  }

  private async handleGuildMemberUpdate(
    oldMember: Discord.GuildMember,
    newMember: Discord.GuildMember,
  ) {
    await this.antiNukeService.monitorActions(
      newMember.guild,
      CHANNEL_ACTION_TYPE.MEMBER_UPDATE,
      this.client,
    );
  }

  private async handleRoleCreate(role: Discord.Role) {
    await this.antiNukeService.monitorActions(
      role.guild,
      CHANNEL_ACTION_TYPE.ROLE_CREATE,
      this.client,
    );
  }

  private async handleRoleUpdate(oldRole: Discord.Role, newRole: Discord.Role) {
    await this.antiNukeService.monitorActions(
      newRole.guild,
      CHANNEL_ACTION_TYPE.ROLE_UPDATE,
      this.client,
    );
  }

  private async handleGuildUpdate(
    oldGuild: Discord.Guild,
    newGuild: Discord.Guild,
  ) {
    await this.antiNukeService.monitorActions(
      newGuild,
      CHANNEL_ACTION_TYPE.GUILD_UPDATE,
      this.client,
    );
  }

  private async handleWebhookUpdate(webhook: Discord.Webhook) {}

  private async handleGuildBanAdd(ban: Discord.GuildBan) {
    await this.antiNukeService.monitorActions(
      ban.guild,
      CHANNEL_ACTION_TYPE.WEBHOOK_CREATE,
      this.client,
    );
  }

  private async handleGuildBanRemove(ban: Discord.GuildBan) {
    await this.antiNukeService.monitorActions(
      ban.guild,
      CHANNEL_ACTION_TYPE.MEMBER_BAN_REMOVE,
      this.client,
    );
  }

  private async handleEmojiCreate(emoji) {
    // Implement handling logic
  }

  private async handleEmojiUpdate(oldEmoji, newEmoji) {
    // Implement handling logic
  }

  private async handleEmojiDelete(emoji) {
    // Implement handling logic
  }

  private async handleInviteCreate(invite: Discord.Invite) {
    this.inviteTrackerService.addNewInvite(invite);
  }

  private async handleInviteDelete(invite: Discord.Invite) {
    this.inviteTrackerService.removeInvite(invite);
  }

  private async onVoiceStateUpdate(
    oldState: Discord.VoiceState,
    newState: Discord.VoiceState,
  ) {
    if (this.helperService.isProduction()) {
      this.autoVoiceChannelService.handleVoiceStateUpdate(oldState, newState);
    }
  }

  private async onGuildMemberAdd(member: Discord.GuildMember) {
    // Call the Welcome command Service

    this.inviteTrackerService.monitorInvite(member);
    if (this.helperService.isProduction()) {
      this.handleGuildMemberAdd(member);
      this.autoModService.handleBotAdditionToServer(member);
      this.autoRoleService.handleAutoRole(member, this.client);
      this.antiRaidCommand.watch(member);
      this.handleInviteOnlyServersAndWelcome(member);
    } else {
      this.handleInviteOnlyServersAndWelcome(member);
    }
  }

  private async handleInviteOnlyServersAndWelcome(member: Discord.GuildMember) {
    if (member.user.bot) {
      this.logger.log(
        `Bot ${member.user.tag} joined the server, skipping invite-only check.`,
      );
      return;
    }
    const handleInviteOnlyServers =
      await this.serverRepository.isInviteOnlyServer(member.guild.id);
    if (handleInviteOnlyServers) {
      const isUserRegistered =
        await this.allowedUsersRepository.isUserRegistered(
          member.user.username,
          member.guild.id,
        );
      if (!isUserRegistered) {
        try {
          await member.send(
            'You are not on the list of allowed users for this server.',
          );
        } catch (error) {
          this.logger.log(`Error Sending message.`);
        }
        await member.kick(
          'You are not on the list of allowed users for this server.',
        );
        this.logger.log(
          `Kicked ${member.user.tag} from ${member.guild.name} - not an allowed user.`,
        );
      } else {
        if (this.helperService.isProduction()) {
          this.welcomeService.handleWelcome(member);
        }
      }
    } else {
      if (this.helperService.isProduction()) {
        this.welcomeService.handleWelcome(member);
      }
    }
  }

  private async guildMemberRemove(member: Discord.GuildMember) {
    this.handleGuildMemberRemove(member);
    if (this.helperService.isProduction()) {
      const username = member.user.tag;
      const guildName = member.guild.name;
      const description = `We're sad to see you go, **${username}**! Thanks for being a part of **${guildName}**. We hope you had a great time here!`;

      const fields = [
        {
          name: 'Member Information',
          value: `Username: ${username}\nID: ${member.id}`,
          inline: false,
        },
        {
          name: 'Parting Thought',
          value:
            "If you have any feedback or reasons you'd like to share for leaving, we're all ears. Your insights help us improve!",
          inline: false,
        },
      ];

      const timestamp = new Date();
      const embed = new Discord.EmbedBuilder()
        .setColor('#ed4245') // Use a soft red color to signify departure
        .setTitle('Farewell, Adventurer!')
        .setDescription(description)
        .addFields(fields)
        .setTimestamp(timestamp)
        .setThumbnail(member.user.displayAvatarURL());

      // Send a DM to the departing user
      await member.user
        .send({
          content: `It was wonderful having you in **${guildName}**. Here's a little farewell note for you!`,
          embeds: [embed],
        })
        .catch((error) =>
          console.error(`Could not send DM to ${member.user.tag}.`, error),
        );

      // Log the member's departure in the server logs
      await this.serverLoggerService.sendLogMessage(
        member.guild,
        LogChannelType.LEAVE,
        '',
        embed,
      );
    }
  }

  async logMemberBan(ban) {
    const guildName = ban.guild.name;
    const username = ban.user.tag;
    const embed = new Discord.EmbedBuilder()
      .setColor('#ff0000') // Red color for ban
      .setTitle('Member Banned')
      .setDescription(`${username} has been banned from **${guildName}**.`)
      .addFields(
        { name: 'User', value: username, inline: true },
        { name: 'User ID', value: ban.user.id, inline: true },
      )
      .setTimestamp();

    await this.serverLoggerService.sendLogMessage(
      ban.guild,
      LogChannelType.MODERATOR,
      '',
      embed,
    );
  }

  async logMemberUnban(ban) {
    const guildName = ban.guild.name;
    const username = ban.user.tag;
    const embed = new Discord.EmbedBuilder()
      .setColor('#00ff00') // Green color for unban
      .setTitle('Member Unbanned')
      .setDescription(`${username} has been unbanned from **${guildName}**.`)
      .addFields(
        { name: 'User', value: username, inline: true },
        { name: 'User ID', value: ban.user.id, inline: true },
      )
      .setTimestamp();

    await this.serverLoggerService.sendLogMessage(
      ban.guild,
      LogChannelType.MODERATOR,
      '',
      embed,
    );
  }

  async logChannelDelete(channel) {
    const guildName = channel.guild.name;
    const embed = new Discord.EmbedBuilder()
      .setColor('#ff4500') // Orange color for channel deletion
      .setTitle('Channel Deleted')
      .setDescription(`A channel has been deleted in **${guildName}**.`)
      .addFields({ name: 'Channel', value: channel.name, inline: true })
      .setTimestamp();

    await this.serverLoggerService.sendLogMessage(
      channel.guild,
      LogChannelType.MODERATOR,
      '',
      embed,
    );
  }

  async logRoleDelete(role) {
    const guildName = role.guild.name;
    const embed = new Discord.EmbedBuilder()
      .setColor('#ff4500') // Orange color for role deletion
      .setTitle('Role Deleted')
      .setDescription(`A role has been deleted in **${guildName}**.`)
      .addFields({ name: 'Role', value: role.name, inline: true })
      .setTimestamp();

    await this.serverLoggerService.sendLogMessage(
      role.guild,
      LogChannelType.MODERATOR,
      '',
      embed,
    );
  }

  private async onInteractionCreate(interaction: Discord.Interaction) {
    if (interaction.isCommand()) {
      await this.commandsService.executeCommand(interaction, this.client);
    } else if (interaction.isStringSelectMenu()) {
      await this.botInteractionService.executeCommand(interaction, this.client);
    } else if (interaction.isButton()) {
      await this.buttonInteractionService.executeCommand(
        interaction,
        this.client,
      );
    } else if (interaction.isModalSubmit()) {
      await this.modalInteractionService.executeCommand(
        interaction,
        this.client,
      );
    }
  }

  private async onGuildCreate(guild: Discord.Guild) {
    try {
      const antiConfig: AntiConfig = {
        antiSpamMaxMessagesCount: 5,
        antiSpamTimeWindow: 5,
        antiSpamMaxWarnings: 3,
      };

      const newServerData: CreateServerType = {
        id: guild.id,
        name: guild.name,
        owner: guild.ownerId,
        antiConfig,
      };
      const server =
        await this.serverRepository.findOrCreateNewServer(newServerData);
      this.logger.log(`Joined a new server: ${server.name}`);
    } catch (error) {
      this.logger.error(`Error handling guildCreate event: ${error}`);
    }
    this.logger.log(`Logged in as ${this.client.user.tag}!`);
    if (!this.helperService.isProduction()) {
      await this.commandRegistrationService.unregisterCommands(
        this.client,
        this.configService.get<string>('DISCORD_BOT_TOKEN'),
      );
      await this.commandRegistrationService.registerCommands(
        this.client,
        null,
        this.configService.get<string>('DISCORD_BOT_TOKEN'),
      );
    } else {
      this.commandRegistrationService.registerCommands(
        this.client,
        guild.id,
        this.configService.get<string>('DISCORD_BOT_TOKEN'),
      );
    }
  }

  private async onMessageDelete(message: Discord.Message) {
    // Ensure the message is complete (not partial)
    if (!message.partial) {
      await this.snipeService.addSnipeMessage(message);
    }
  }
  private async onMessageUpdate(
    oldMessage: Discord.Message,
    newMessage: Discord.Message,
  ) {
    if (!newMessage.guildId || newMessage.author.bot) return;
    await this.antiLinkCommandService.handleAntiLink(newMessage);
    this.mediaOnlyService.handleMessage(newMessage);
    this.mentionLimitService.handleMessage(newMessage);
  }

  private async handleBotTag(message: Discord.Message, prefix: string) {
    // Inside your message event listener or handler function
    const botMention =
      `<@${this.client.user.id}>` || `<@!${this.client.user.id}>`;

    if (message.content.trim() === botMention) {
      const prefix =
        (await this.serverRepository.getServerPrefix(message.guildId)) || '!';
      const helpEmbed = new Discord.EmbedBuilder()
        .setColor('#0099FF') // You can choose a color that matches your bot's theme
        .setTitle(`${this.client.user.username} Assistance`)
        .setDescription(
          `Hello there! I'm here to help you navigate through my features and commands. Use \`${prefix}command [args]\` to execute a command.`,
        )
        .addFields(
          {
            name: 'Getting Started',
            value: `Use \`${prefix}help\` to see all the commands available.`,
          },
          {
            name: 'Command Format',
            value:
              'Arguments enclosed in `[ ]` are required, while those in `( )` are optional.',
          },
          {
            name: 'Support',
            value: `If you need further assistance, you can reach out to our ${BOT_TEXTS.BOT_SUPPORT_VANITY}`,
          },
        )
        .setThumbnail(this.client.user.displayAvatarURL())
        .setFooter({
          text: 'I am here to make your Discord experience better!',
        })
        .setTimestamp();

      const botMessage = await message.reply({ embeds: [helpEmbed] });
      await this.helperService.deleteLastBotMessageAfterInterval(botMessage);
    }
  }

  private async onMessageCreate(message: Discord.Message) {
    if (!message.guildId || message.author.bot) return;

    // Check and handle links in the message
    await this.antiLinkCommandService.handleAntiLink(message);
    this.mediaOnlyService.handleMessage(message);
    this.afkService.handleAfkStatus(message);
    this.mentionLimitService.handleMessage(message);
    this.spamDetectionService.analyzeMessage(message, this.client);
    this.spamDetectionService.handleEveryOnePing(message);
    if (this.helperService.isProduction()) {
      try {
        this.dailyMessageCountService.incrementMessageCount(
          message.author.id,
          message.guildId,
          new Date(),
        );
      } catch (error) {
        this.logger.error(
          `Error handling message from user ${message.author.tag}: ${error.message}`,
        );
      }
    }

    // Fetch server-specific command prefix
    const prefix =
      (await this.serverRepository.getServerPrefix(message.guildId)) || '!';

    this.handleBotTag(message, prefix);

    // Ensure message starts with the expected prefix
    if (!message.content.startsWith(prefix)) return;

    // Extract command name and arguments from the message
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    // Call the command service based on the command name
    await this.commandsService.executeTextCommand(
      commandName,
      message,
      args,
      this.client,
    );
  }

  private async onReady() {
    this.logger.log(`Logged in as ${this.client.user.tag}!`);

    try {
      // Unregister all commands

      if (!this.helperService.isProduction()) {
        // await this.commandRegistrationService.unregisterCommands(
        //   this.client,
        //   this.configService.get<string>('DISCORD_BOT_TOKEN'),
        // );
        this.commandRegistrationService.registerCommands(
          this.client,
          this.configService.get<string>('GUILD_ID'),
          this.configService.get<string>('DISCORD_BOT_TOKEN'),
        );
        // setInterval(
        //   this.vanityCommandService.sendVanityURLAutomatically,
        //   VANITY_CHECK_INTERVAL,
        // );
      } else {
        this.commandRegistrationService.registerCommands(
          this.client,
          null,
          this.configService.get<string>('DISCORD_BOT_TOKEN'),
        );
      }
    } catch (error) {
      this.logger.error(`Error handling ready event: ${error}`);
    }
  }

  private async onGuildDelete(guild: Discord.Guild) {
    try {
      await this.serverRepository.softDelete(guild.id);
      this.logger.log(
        `Left the server and removed from database: ${guild.name}`,
      );
    } catch (error) {
      this.logger.error(`Error handling guildDelete event: ${error}`);
    }
  }
}
