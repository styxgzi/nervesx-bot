// commands.service.ts
import { Injectable } from '@nestjs/common';
import { Client, CommandInteraction, Message } from 'discord.js';
import { BanCommandService } from './moderation/ban.command';
import { WarnCommandService } from './moderation/warn.command';
import { TimeoutCommandService } from './moderation/timeout.command';
import { JailCommandService } from './moderation/jail.command';
import { SetupCommandService } from './moderation/setup.command';
import { RoleAssignmentService } from './moderation/assign-role.command';
import { HelpCommandService } from './help.command';
import { AntiRaidCommand } from './automod/antiraid.command';
import { KickCommandService } from './moderation/kick.command';
import { WhitelistCommandService } from './moderation/whitelist.command';
import { PurgeCommandService } from './features/purge.command';
import { MuteCommandService } from './features/mute.command';
import { UnmuteCommandService } from './features/unmute.command';
import { SetChannelCommandService } from './moderation/setChannel.command';
import { UnJailCommandService } from './moderation/unjail.command';
import { HelperService } from 'lib/classes/Helper';
import { VanityCommandService } from './intractions/vanity.command';
import { HackBanCommandService } from './moderation/hackban.command';
import { SetAutoRoleCommandService } from './moderation/set-autorole.command';
import { AvatarCommandService } from './intractions/avatar.command';
import { MemberCountService } from './moderation/member-count.command';
import { NicknameService } from './moderation/setnickname.command';
import { SetServerConfigCommandService } from './moderation/setConfig.command';
import { PurgeLinksCommandService } from './features/purge-links.command';
import { ServerInfoService } from './intractions/server-info.command';
import { UserInfoCommandService } from './intractions/user-info.command';
import { ChannelLockService } from './moderation/channel-lockdown.command';
import { MediaOnlyService } from './features/media.command';
import { BOT_COMMANDS, BOT_TEXTS } from 'src/constants/strings';
import { MusicService } from './features/music.command';
import { ServerLockDownService } from './automod/lockdown.command';
import { UnBanCommandService } from './moderation/unban.command';
import { ByPassAntiLinkService } from './features/bypassAntiLink.command';
import { PingTextCommandService } from './intractions/ping.command';
import { AfkService } from './features/afk.command';
import { AutoVoiceChannelService } from './features/auto-voice.command';
import { MoveAllMembersService } from './moderation/move-member.command';
// Import other command services...
import stringSimilarity from 'string-similarity'; // Use an efficient library for Levenshtein distance
import { SnipeService } from './moderation/snipe-message.command';
import { SecurityScan } from 'lib/classes/SecurityScan';
import { ServerBackupCommandService } from './features/server-backup.command';
import { RegisterCommandService } from './moderation/register.command';
import { InviteTrackerService } from 'lib/services/invite-tracker.service';

@Injectable()
export class CommandsService {
  constructor(
    private banCommandService: BanCommandService,
    private warnCommandService: WarnCommandService,
    private timeoutCommandService: TimeoutCommandService,
    private jailCommandService: JailCommandService,
    private setupCommandService: SetupCommandService,
    private roleAssignmentService: RoleAssignmentService,
    private helpCommandService: HelpCommandService,
    private antiRaidCommand: AntiRaidCommand,
    private kickCommandService: KickCommandService,
    private whitelistCommandService: WhitelistCommandService,
    private purgeCommandService: PurgeCommandService,
    private muteCommandService: MuteCommandService,
    private setChannelCommandService: SetChannelCommandService,
    private unJailCommandService: UnJailCommandService,
    private helperService: HelperService,
    private vanityCommandService: VanityCommandService,
    private hackBanCommandService: HackBanCommandService,
    private setAutoRoleCommandService: SetAutoRoleCommandService,
    private avatarCommandService: AvatarCommandService,
    private memberCountService: MemberCountService,
    private nicknameService: NicknameService,
    private setServerConfigCommandService: SetServerConfigCommandService,
    private purgeLinksCommandService: PurgeLinksCommandService,
    private serverInfoService: ServerInfoService,
    private userInfoCommandService: UserInfoCommandService,
    private channelLockService: ChannelLockService,
    private mediaOnlyService: MediaOnlyService,
    private musicService: MusicService,
    private serverLockDownService: ServerLockDownService,
    private unBanCommandService: UnBanCommandService,
    private byPassAntiLinkService: ByPassAntiLinkService,
    private pingTextCommandService: PingTextCommandService,
    private afkService: AfkService,
    private autoVoiceChannelService: AutoVoiceChannelService,
    private unmuteCommandService: UnmuteCommandService,
    private moveAllMembersService: MoveAllMembersService,
    private snipeService: SnipeService,
    private securityScan: SecurityScan,
    private serverBackupCommandService: ServerBackupCommandService,
    private registerCommandService: RegisterCommandService,
    private inviteTrackerService: InviteTrackerService,
  ) {}

  private readonly stagingPrefix = !this.helperService.isProduction()
    ? 'test'
    : '';
  private commands = Object.values(BOT_COMMANDS);

  async executeCommand(interaction: CommandInteraction, client: Client) {
    try {
      switch (interaction.commandName) {
        case 'setup':
          await this.setupCommandService.execute(interaction, client);
          break;
        case 'help':
          await this.helpCommandService.execute(interaction);
          break;
        case 'ping':
          await this.pingTextCommandService.execute(interaction);
          break;
      }
    } catch (error) {
      console.error(error);
      interaction.reply(`Error when executing ${interaction.commandName}`);
    }
  }
  async executeTextCommand(
    commandName: string,
    message: Message,
    args: string[],
    client: Client,
  ) {
    try {
      switch (commandName) {
        case this.stagingPrefix + BOT_COMMANDS.BAN:
        case this.stagingPrefix + BOT_COMMANDS.HBAN:
          await this.hackBanCommandService.executeText(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.UNBAN:
        case this.stagingPrefix + BOT_COMMANDS.HUNBAN:
          await this.unBanCommandService.executeText(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.SETUP:
          await this.setupCommandService.executeText(message, args, client);
          break;
        case this.stagingPrefix + BOT_COMMANDS.TIMEOUT:
          await this.timeoutCommandService.executeText(
            message,
            args,
            BOT_COMMANDS.TIMEOUT,
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.REMOVE_TIMEOUT:
          await this.timeoutCommandService.executeText(
            message,
            args,
            BOT_COMMANDS.REMOVE_TIMEOUT,
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.WARN:
          await this.warnCommandService.executeText(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.JAILED_USERS_LIST:
          await this.jailCommandService.jailList(message, args, client);
          break;
        case this.stagingPrefix + BOT_COMMANDS.JAIL:
          await this.jailCommandService.executeText(message, args, client);
          break;
        case this.stagingPrefix + BOT_COMMANDS.BAIL:
          await this.unJailCommandService.executeText(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.ROLE:
          await this.roleAssignmentService.executeText(message, args, 'assign');
          break;
        case this.stagingPrefix + BOT_COMMANDS.REMOVE_ROLE:
        case this.stagingPrefix + BOT_COMMANDS.REMOVE_ROLE_ALIAS:
          await this.roleAssignmentService.executeText(
            message,
            args,
            'unassign',
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.HELP:
          await this.helpCommandService.executeText(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.KICK:
          await this.kickCommandService.executeMultiKickTextCommand(
            message,
            args,
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.WHITELIST:
        case this.stagingPrefix + BOT_COMMANDS.WL:
          await this.whitelistCommandService.executeText(
            message,
            args,
            BOT_COMMANDS.WHITELIST,
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.UN_WHITELIST:
        case this.stagingPrefix + BOT_COMMANDS.UWL:
          await this.whitelistCommandService.executeText(
            message,
            args,
            BOT_COMMANDS.UN_WHITELIST,
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.ADD_ADMIN:
          await this.whitelistCommandService.executeText(
            message,
            args,
            BOT_COMMANDS.ADD_ADMIN,
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.ADD_MOD:
          await this.whitelistCommandService.executeText(
            message,
            args,
            BOT_COMMANDS.ADD_MOD,
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.REMOVE_ADMIN:
          await this.whitelistCommandService.executeText(
            message,
            args,
            BOT_COMMANDS.REMOVE_ADMIN,
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.REMOVE_MOD:
          await this.whitelistCommandService.executeText(
            message,
            args,
            BOT_COMMANDS.REMOVE_MOD,
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.ADD_ADMIN_ROLE:
          await this.whitelistCommandService.executeText(
            message,
            args,
            BOT_COMMANDS.ADD_ADMIN_ROLE,
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.ADD_MOD_ROLE:
          await this.whitelistCommandService.executeText(
            message,
            args,
            BOT_COMMANDS.ADD_MOD_ROLE,
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.REMOVE_ADMIN_ROLE:
          await this.whitelistCommandService.executeText(
            message,
            args,
            BOT_COMMANDS.REMOVE_ADMIN_ROLE,
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.REMOVE_MOD_ROLE:
          await this.whitelistCommandService.executeText(
            message,
            args,
            BOT_COMMANDS.REMOVE_MOD_ROLE,
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.PURGE:
        case this.stagingPrefix + BOT_COMMANDS.CLEAR:
          await this.purgeCommandService.executeText(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.MUTE:
          await this.muteCommandService.executeText(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.UNMUTE:
          await this.unmuteCommandService.executeText(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.SET_CHANNEL:
          await this.setChannelCommandService.executeText(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.VANITY:
          await this.vanityCommandService.handleAntiLink(message);
          break;
        case this.stagingPrefix + BOT_COMMANDS.SET_AUTOROLE:
          await this.setAutoRoleCommandService.executeText(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.AVATAR:
        case this.stagingPrefix + BOT_COMMANDS.AVATAR_ALIAS:
          await this.avatarCommandService.executeText(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.SERVER_AVATAR:
        case this.stagingPrefix + BOT_COMMANDS.SERVER_AVATAR_ALIAS:
          await this.avatarCommandService.fetchServerSpecificAvatar(message);
          break;
        case this.stagingPrefix + BOT_COMMANDS.BANNER:
          await this.avatarCommandService.getProfileBanner(message);
          break;
        case this.stagingPrefix + BOT_COMMANDS.SERVER_BANNER:
        case this.stagingPrefix + BOT_COMMANDS.SERVER_BANNER_ALIAS:
          await this.avatarCommandService.getServerBanner(message);
          break;
        case this.stagingPrefix + BOT_COMMANDS.MEMBER_COUNT_ALIAS:
        case this.stagingPrefix + BOT_COMMANDS.MEMBER_COUNT:
          await this.memberCountService.executeText(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.NICKNAME:
        case this.stagingPrefix + BOT_COMMANDS.SET_NICKNAME:
          await this.nicknameService.changeNickname(message);
          break;
        case this.stagingPrefix + BOT_COMMANDS.SET_PREFIX:
        case this.stagingPrefix + BOT_COMMANDS.SET_SECOND_OWNER:
        case this.stagingPrefix + BOT_COMMANDS.SET_MENTION_LIMIT:
        case this.stagingPrefix + BOT_COMMANDS.SPAM_WHITELIST:
        case this.stagingPrefix + BOT_COMMANDS.SPAM_WHITELIST_ALIAS:
        case this.stagingPrefix + BOT_COMMANDS.REMOVE_SPAM_WHITELIST:
        case this.stagingPrefix + BOT_COMMANDS.REMOVE_SPAM_WHITELIST_ALIAS:
        case this.stagingPrefix + BOT_COMMANDS.SET_ADMIN:
        case this.stagingPrefix + BOT_COMMANDS.REMOVE_SET_ADMIN:
          await this.setServerConfigCommandService.executeText(
            message,
            args,
            commandName,
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.SERVER_CONFIG:
          await this.setServerConfigCommandService.getServerConfigEmbed(
            message,
            args,
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.PURGE_LINK:
          await this.purgeLinksCommandService.executeText(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.SERVER_INFO:
        case this.stagingPrefix + BOT_COMMANDS.SERVER_INFO_ALIAS:
          await this.serverInfoService.executeText(message);
          break;
        case this.stagingPrefix + BOT_COMMANDS.AUDIT_LOGS:
          await this.serverInfoService.getAuditLogs(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.OFFICIALS:
          await this.serverInfoService.serverOfficials(message);
          break;
        case this.stagingPrefix + BOT_COMMANDS.WHITELISTED:
          await this.serverInfoService.getServerWhiteListedUsers(message);
          break;
        case this.stagingPrefix + BOT_COMMANDS.USER_INFO:
        case this.stagingPrefix + BOT_COMMANDS.USER_INFO_ALIAS:
          await this.userInfoCommandService.execute(message);
          break;
        case this.stagingPrefix + BOT_COMMANDS.USER_MESSAGE_COUNT:
          await this.userInfoCommandService.displayUserStats(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.TOP_MESSAGES:
          await this.userInfoCommandService.displayTopUsersByMessageCount(
            message,
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.LOCK_CHANNEL:
        case this.stagingPrefix + BOT_COMMANDS.LC:
          await this.channelLockService.lockChannel(message);
          break;
        case this.stagingPrefix + BOT_COMMANDS.UNLOCK_CHANNEL:
        case this.stagingPrefix + BOT_COMMANDS.ULC:
          await this.channelLockService.unlockChannel(message);
          break;
        case this.stagingPrefix + BOT_COMMANDS.MEDIA_ONLY:
        case this.stagingPrefix + BOT_COMMANDS.MO:
          await this.mediaOnlyService.setMediaOnlyChannel(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.UNSET_MEDIA_ONLY:
        case this.stagingPrefix + BOT_COMMANDS.UMO:
          await this.mediaOnlyService.unSetMediaOnlyChannel(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.ANTI_LINK:
        case this.stagingPrefix + BOT_COMMANDS.AL:
          await this.byPassAntiLinkService.setAntiLinkAllowedChannels(
            message,
            args,
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.ANTI_LINK:
        case this.stagingPrefix + BOT_COMMANDS.AL:
          await this.byPassAntiLinkService.unSetAntiLinkAllowedChannels(
            message,
            args,
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.UNSET_ANTI_LINK_CHANNEL:
        case this.stagingPrefix + BOT_COMMANDS.UAL:
          await this.byPassAntiLinkService.unSetAntiLinkAllowedChannels(
            message,
            args,
          );
          break;
        // case this.stagingPrefix + BOT_COMMANDS.PLAY:
        //   await this.musicService.play(message, args);
        //   break;
        case this.stagingPrefix + BOT_COMMANDS.LOCK_DOWN:
          await this.serverLockDownService.executeText(message, args);
          break;
        // case this.stagingPrefix + BOT_COMMANDS.PING:
        //   await this.pingTextCommandService.executeText(message);
        //   break;
        case this.stagingPrefix + BOT_COMMANDS.AFK:
          await this.afkService.sendAfkCommandEmbed(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.AUTO_VC_CREATE:
        case this.stagingPrefix + BOT_COMMANDS.AUTO_VC_CREATE_ALIAS:
          await this.autoVoiceChannelService.executeText(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.AUTO_VC_TEMPLATE:
        case this.stagingPrefix + BOT_COMMANDS.AUTO_VC_TEMPLATE_ALIAS:
          await this.autoVoiceChannelService.setChannelNameTemplate(
            message,
            args,
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.AUTO_VC_GET_VC_OWNER:
          await this.autoVoiceChannelService.updateChannelOwner(message);
          break;
        case this.stagingPrefix + BOT_COMMANDS.MOVE_ALL_MEMBERS:
          await this.moveAllMembersService.executeText(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.SNIPE:
          await this.snipeService.executeText(message, args);
          break;
        case this.stagingPrefix + BOT_COMMANDS.INVITES:
          await this.inviteTrackerService.execute(message, client);
          break;
        case this.stagingPrefix + BOT_COMMANDS.SECURITY_SCAN:
          await this.securityScan.performSecurityScan(message, message.guildId);
          break;
        case this.stagingPrefix + BOT_COMMANDS.SERVER_BACKUP:
          await this.serverBackupCommandService.executeText(
            message,
            args,
            client,
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.SERVER_BACKUP_RESTORE:
          await this.serverBackupCommandService.executeTextRestoreBackup(
            message,
            args,
            client,
          );
          break;
        case this.stagingPrefix + BOT_COMMANDS.REGISTER:
          await this.registerCommandService.executeText(message, args);
          break;
        default:
          if (this.helperService.isProduction()) {
            const { bestMatch } = stringSimilarity.findBestMatch(
              this.stagingPrefix + commandName,
              this.commands.map((command) => this.stagingPrefix + command),
            );
            const closestMatch = bestMatch.target;
            let botMessage = null;
            if (closestMatch) {
              botMessage = await message.reply(
                `Hmm, I can't find that command. Did you mean \`${closestMatch}\`? Just checking to make sure we're on the same page!`,
              );
            } else {
              botMessage = await message.reply(
                "Oops, I couldn't find that command! Are you sure it exists? If you're lost, try `/help` to see what I can do!",
              );
            }
            await this.helperService.deleteLastBotMessageAfterInterval(
              botMessage,
            );
          }
          break;
      }
      // await message.delete();
    } catch (error) {
      console.error(error);
      const botMessage = await message.reply(
        `Whoops! 🙈 Seems like my paper plane got lost on the way to the Mod logs channel! Can someone give me a map? ${commandName} \n \n Contact  ${BOT_TEXTS.BOT_SUPPORT_VANITY} `,
      );
      try {
        // await message.delete();
      } catch (error) {
        console.error(error);
      }
      await this.helperService.deleteLastBotMessageAfterInterval(botMessage);
    }
  }
}
