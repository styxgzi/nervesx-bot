import { Module } from '@nestjs/common';
import { DiscordBotService } from './discord-bot/discord-bot.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CommandRegistrationService } from './command-registration/command-registration.service';
import { CommandsService } from './commands/command.service';
import { BanCommandService } from './commands/moderation/ban.command';
import { JailCommandService } from './commands/moderation/jail.command';
import { WarnCommandService } from './commands/moderation/warn.command';
import { TimeoutCommandService } from './commands/moderation/timeout.command';
import { AutoModService } from './discord-bot/auto-mod.service';
import { SetupCommandService } from './commands/moderation/setup.command';
import { MongooseModule } from '@nestjs/mongoose';
import { HelperService } from 'lib/classes/Helper';
import { RoleAssignmentService } from './commands/moderation/assign-role.command';
import { AutoVoiceChannelService } from './commands/features/auto-voice.command';
import { Server, ServerSchema } from 'lib/models/server.schema';
import {
  VoiceChannelTemplate,
  VoiceChannelTemplateSchema,
} from 'lib/models/voice-channel.schema';
import { VoiceChannelOwnersService } from 'lib/classes/VoiceChannelOwners';
import { HelpCommandService } from './commands/help.command';
import { AntiRaidCommand } from './commands/automod/antiraid.command';
import { AntiLinkCommandService } from './commands/automod/anit-link.command';
import { WelcomeService } from 'lib/classes/Welcome';
import { KickCommandService } from './commands/moderation/kick.command';
import { MemberUpdateService } from 'lib/classes/MemberUpdate';
import { SecurityService } from 'lib/classes/Security';
import { PunishmentService } from 'lib/classes/Punishment';
import {
  ServerLogChannel,
  ServerLogChannelSchema,
} from 'lib/models/serverLogChannels.schema';
import { ServerLogChannelRepository } from 'lib/repository/server-log-channel.repository';
import { ServerRepository } from 'lib/repository/server.repository';
import { WhitelistCommandService } from './commands/moderation/whitelist.command';
import { ServerLoggerService } from 'lib/classes/ServerLogger';
import { HealthCheckController } from './controllers/health.controller';
import { PurgeCommandService } from './commands/features/purge.command';
import { MuteCommandService } from './commands/features/mute.command';
import { UnmuteCommandService } from './commands/features/unmute.command';
import { SetChannelCommandService } from './commands/moderation/setChannel.command';
import { JailedUserRepository } from 'lib/repository/jailed-user.repository';
import { UnJailCommandService } from './commands/moderation/unjail.command';
import { JailedUser, JailedUserSchema } from 'lib/models/jailedUser.schema';
import { VanityCommandService } from './commands/intractions/vanity.command';
import { HackBanCommandService } from './commands/moderation/hackban.command';
import { AutoRoleService } from './commands/automod/autorole.command';
import { SetAutoRoleCommandService } from './commands/moderation/set-autorole.command';
import { AvatarCommandService } from './commands/intractions/avatar.command';
import { AntiNukeService } from './commands/automod/aniti-nuke.command';
import { MemberCountService } from './commands/moderation/member-count.command';
import { NicknameService } from './commands/moderation/setnickname.command';
import { SetServerConfigCommandService } from './commands/moderation/setConfig.command';
import { PurgeLinksCommandService } from './commands/features/purge-links.command';
import { ServerInfoService } from './commands/intractions/server-info.command';
import { UserInfoCommandService } from './commands/intractions/user-info.command';
import { ChannelLockService } from './commands/moderation/channel-lockdown.command';
import { MediaOnlyService } from './commands/features/media.command';
import { MusicService } from './commands/features/music.command';
import { ServerLockDownService } from './commands/automod/lockdown.command';
import { UnBanCommandService } from './commands/moderation/unban.command';
import { ByPassAntiLinkService } from './commands/features/bypassAntiLink.command';
import { BotInteractionService } from './commands/selectInteraction.service';
import { PingTextCommandService } from './commands/intractions/ping.command';
import { AfkService } from './commands/features/afk.command';
import { AfkStatus, AfkStatusSchema } from 'lib/models/afkstatus.schema';
import { ButtonInteractionService } from './commands/buttonInteration.service';
import { AfkRepository } from 'lib/repository/afk.repository';
import { MentionLimitService } from './commands/automod/mention.command';
import { MoveAllMembersService } from './commands/moderation/move-member.command';
import { SnipeService } from './commands/moderation/snipe-message.command';
import {
  SnipeMessage,
  SnipeMessageSchema,
} from 'lib/models/snipe-message.schema';
import { SnipeMessageRepository } from 'lib/repository/snipe-message.repository';
import { SpamDetectionService } from './commands/automod/anity-spam.command';
import { RedisService } from 'lib/services/Redis.service';
import { DetectionService } from 'lib/classes/DetectionService';
import { ActionService } from 'lib/classes/ActionService';
import { AccountService } from 'lib/classes/AccountService';
import { SecurityScan } from 'lib/classes/SecurityScan';
import { SecurityAnalyzer } from 'lib/classes/SecurityAnalyzer';
import { LinkDetectionService } from 'lib/classes/LinkDetectionService';
import { ServerBackupCommandService } from './commands/features/server-backup.command';
import { ServerBackupService } from 'lib/services/ServerBackup.service';
import {
  ServerBackup,
  ServerBackupSchema,
} from 'lib/models/server-backup.schema';
import { ServerBackupRepository } from 'lib/repository/server-backup.repository';
import { AllowedUsersRepository } from 'lib/repository/registered-user.repository';
import {
  RegisteredUser,
  RegisteredUserSchema,
} from 'lib/models/registered-users.schema';
import { RegisterCommandService } from './commands/moderation/register.command';
import { ModalInteractionService } from './commands/modalInteration.service';
import {
  DailyMessageCount,
  DailyMessageCountSchema,
} from 'lib/models/messageCount.schema';
import { DailyMessageCountService } from 'lib/services/MessageCount.service';
import { InviteTrackerService } from 'lib/services/invite-tracker.service';
import { InviteSchema } from 'lib/models/invite.schema';
import { Invite } from 'discord.js';
import { InviteRepository } from 'lib/repository/invite.repository';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: Server.name, schema: ServerSchema }]),
    MongooseModule.forFeature([
      { name: VoiceChannelTemplate.name, schema: VoiceChannelTemplateSchema },
    ]),
    MongooseModule.forFeature([
      { name: ServerLogChannel.name, schema: ServerLogChannelSchema },
    ]),
    MongooseModule.forFeature([
      { name: JailedUser.name, schema: JailedUserSchema },
    ]),
    MongooseModule.forFeature([
      { name: AfkStatus.name, schema: AfkStatusSchema },
    ]),
    MongooseModule.forFeature([
      { name: SnipeMessage.name, schema: SnipeMessageSchema },
    ]),
    MongooseModule.forFeature([
      { name: ServerBackup.name, schema: ServerBackupSchema },
    ]),
    MongooseModule.forFeature([
      { name: RegisteredUser.name, schema: RegisteredUserSchema },
    ]),
    MongooseModule.forFeature([
      { name: DailyMessageCount.name, schema: DailyMessageCountSchema },
    ]),
    MongooseModule.forFeature([{ name: Invite.name, schema: InviteSchema }]),
  ],
  controllers: [HealthCheckController],
  providers: [
    DiscordBotService,
    AutoModService,
    CommandRegistrationService,
    CommandsService,
    AutoVoiceChannelService,
    AntiLinkCommandService,

    // COMMANDS
    BanCommandService,
    JailCommandService,
    WarnCommandService,
    TimeoutCommandService,
    SetupCommandService,
    RoleAssignmentService,
    HelpCommandService,
    AntiRaidCommand,
    KickCommandService,
    WhitelistCommandService,
    PurgeCommandService,
    MuteCommandService,
    UnmuteCommandService,
    SetChannelCommandService,
    VanityCommandService,
    HackBanCommandService,
    AutoRoleService,
    SetAutoRoleCommandService,
    AvatarCommandService,
    AntiNukeService,
    MemberCountService,
    NicknameService,
    SetServerConfigCommandService,
    PurgeLinksCommandService,
    ServerInfoService,
    UserInfoCommandService,
    ChannelLockService,
    MediaOnlyService,
    MusicService,
    ServerLockDownService,
    UnBanCommandService,
    ByPassAntiLinkService,
    PingTextCommandService,
    AfkService,
    ButtonInteractionService,
    MentionLimitService,
    UnmuteCommandService,
    MoveAllMembersService,
    SnipeService,
    SpamDetectionService,
    ServerBackupCommandService,
    RegisterCommandService,
    ModalInteractionService,
    SecurityAnalyzer,

    // Helper
    HelperService,
    VoiceChannelOwnersService,
    WelcomeService,
    MemberUpdateService,
    SecurityService,
    PunishmentService,
    ServerLoggerService,
    UnJailCommandService,
    BotInteractionService,
    RedisService,
    DetectionService,
    ActionService,
    AccountService,
    SecurityScan,
    LinkDetectionService,
    ServerBackupService,
    DailyMessageCountService,
    InviteTrackerService,

    // Repositories
    ServerLogChannelRepository,
    ServerRepository,
    JailedUserRepository,
    AfkRepository,
    SnipeMessageRepository,
    ServerBackupRepository,
    AllowedUsersRepository,
    InviteRepository,
  ],
})
export class AppModule {}
