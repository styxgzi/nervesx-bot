import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';

export type ServerDocument = Server & Document;

export enum SubscriptionPlan {
  BASIC = 'basic',
  PREMIUM = 'premium',
  VIP = 'vip',
}

export interface CreateServerType {
  id: string;
  name: string;
  owner: string;
  antiConfig: AntiConfig;
}

export enum ServerConfigTypes {
  // User perks
  SECOND_OWNERS = 'secondOwners',
  ADMINS = 'adminIds',
  MODS = 'modIds',
  ADMINS_ROLE = 'autoRoleIds',
  MODS_ROLE = 'modRoles',
  WHITELIST_USERS = 'whitelistedUserIds',
  SPAM_WHITELISTED_USERS = 'spamWhitelistedUserIds',

  // Roles perks
  DANGEROUS_ROLES = 'dangerousRoleIds',
  AUTO_ROLES = 'autoRoleIds',

  // Channels
  MEDIA_CHANNELS = 'mediaOnlyChannels',
  BYPASS_ANTI_LINK_CHANNELS = 'antiLinkAllowedChannels',
  WELCOME_CHANNEL = 'welcomeChannelId',
}

@Schema()
export class AntiConfig {
  @Prop({ required: true, default: 5 })
  antiSpamTimeWindow: number;

  @Prop({ required: true, default: 5 })
  antiSpamMaxMessagesCount: number;

  @Prop({ required: true, default: 3 })
  antiSpamMaxWarnings: number;
}

@Schema()
export class Server {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: Date.now })
  joinedAt: Date;

  @Prop({ required: false })
  subscribedAt: Date;

  @Prop({ required: true })
  owner: string;

  @Prop({ default: '!' })
  prefix: string;

  @Prop({ default: [] })
  secondOwners: [string];

  @Prop({ enum: SubscriptionPlan, default: SubscriptionPlan.BASIC })
  subscriptionPlan: SubscriptionPlan;

  @Prop({ default: [] })
  whitelistedUserIds: [string];

  @Prop({ default: [] })
  spamWhitelistedUserIds: [string];

  @Prop({ default: [] })
  dangerousRoleIds: [string];

  @Prop({ default: [] })
  adminIds: [string];

  @Prop({ default: [] })
  modIds: [string];

  @Prop({ default: [] })
  adminRoles: [string];

  @Prop({ default: [] })
  modRoles: [string];

  @Prop({ default: [] })
  mediaOnlyChannels: [string];

  @Prop({ default: [] })
  antiLinkAllowedChannels: [string];

  @Prop({ default: [] })
  autoRoleIds: [string];

  @Prop({ default: '' })
  welcomeChannelId: string;

  @Prop({ default: false })
  isSoftDeleted: boolean;

  @Prop({ default: false })
  isInviteOnlyServer: boolean;

  @Prop({ default: 10 })
  mentionLimit: number;

  @Prop({ type: AntiConfig })
  antiConfig: AntiConfig;
}

export const ServerSchema = SchemaFactory.createForClass(Server);

// Middleware to ensure default values
function ensureDefaults(doc) {
  if (doc) {
    doc.adminRoles = doc.adminRoles || [];
    doc.modRoles = doc.modRoles || [];
    doc.secondOwners = doc.secondOwners || [];
    doc.whitelistedUserIds = doc.whitelistedUserIds || [];
    doc.spamWhitelistedUserIds = doc.spamWhitelistedUserIds || [];
    doc.dangerousRoleIds = doc.dangerousRoleIds || [];
    doc.adminIds = doc.adminIds || [];
    doc.modIds = doc.modIds || [];
    doc.mediaOnlyChannels = doc.mediaOnlyChannels || [];
    doc.antiLinkAllowedChannels = doc.antiLinkAllowedChannels || [];
    doc.autoRoleIds = doc.autoRoleIds || [];
  }
}

ServerSchema.post('find', function (docs) {
  docs.forEach(ensureDefaults);
});

ServerSchema.post('findOne', ensureDefaults);

ServerSchema.post('findOneAndUpdate', ensureDefaults);
ServerSchema.post('save', ensureDefaults);
