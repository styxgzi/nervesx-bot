export const BOT_TEXTS = {
  SERVER_OWNER_CANNOT_BE_BANNED:
    'Oops! You can’t ban the server owner, that’s against the rules!',
  YOU_DON_NOT_HAVE_PERMISSIONS_TO_BAN_A_MEMBER:
    'Looks like you don’t have the permissions to ban members. Check with an admin if you think this is a mistake.',
  YOU_DO_NOT_HAVE_PERMISSIONS_TO_UN_BAN_A_MEMBER:
    'You need special permissions to unban members. Please check with your server administrator.',
  USER_NOT_FOUND: 'Hmmm, I couldn’t find that user. Are you sure they exist?',
  I_DON_NOT_HAVE_PERMISSIONS_TO_BAN_A_MEMBER:
    'I would love to help, but I don’t have the permission to ban members. Can you grant me that power?',
  HAS_BEEN_BANNED: 'has been banished to the shadow realm!',
  THERE_WAS_AN_ERROR:
    'Uh-oh, something went wrong. Let’s try that again, shall we?',
  PLEASE_MENTION_A_USER_TO_BAN:
    'To ban someone, I need to know who. Can you mention them, please?',
  PLEASE_MENTION_A_USER_TO_UN_BAN:
    'I can unban someone, but you need to tell me who.',
  PRISON: 'prison',
  PRISON_ROLE_DESCRIPTION:
    'This is the role for those in time-out. Think of it as digital detention!',
  GOD_MODE_ROLE_DESCRIPTION:
    'The almighty GodMode role for NervesX Bot, bow before your digital overlord!',
  LOG_VIEWER_ROLE_DESCRIPTION:
    'Need to peek at the logs? This role is your all-access pass.',
  MUTED_ROLE_DESCRIPTION:
    'Shh... This is the mute role, for when things get too noisy.',
  YOU_ARE_NOT_AUTHORIZED_TO_PERFORM_THIS_ACTION:
    'Sorry, you’re not authorized to do that. Only the Owner, Second Owner, and whitelisted users have that power.',
  BOT_SUPPORT_VANITY: '[Support Team](https://discord.gg/nervesx).',
};

export const BOT_ROLES = {
  JAIL_ROLE_NAME: 'Jail',
  GOD_MODE_NAME: 'GodMode',
  LOG_VIEWER_NAME: 'LogViewer',
  MUTED_NAME: 'Muted',
};

export const ENVIRONMENTS = {
  PRODUCTION: 'production',
  STAGING: 'staging',
};

export const LOG_CHANNELS = [
  'message-logs',
  'jail-logs',
  'mod-logs',
  'join-leave-logs',
  'server-logs',
];

export const LOG_CHANNELS_NAMES = {
  MESSAGES_LOG: 'message-logs',
  JAIL_LOG: 'jail-log',
  MOD_LOG: 'mod-log',
  JOIN_LEAVE_LOG: 'join-leave-logs',
  SERVER_LOG: 'server-log',
};

export const LOG_CHANNELS_SCHEMA_MAPPING = {
  [LOG_CHANNELS_NAMES.MESSAGES_LOG]: 'messageLogChannel',
  [LOG_CHANNELS_NAMES.JAIL_LOG]: 'jailLogChannel',
  [LOG_CHANNELS_NAMES.MOD_LOG]: 'modLogChannel',
  [LOG_CHANNELS_NAMES.JAIL_LOG]: 'joinLogChannel',
  [LOG_CHANNELS_NAMES.JOIN_LEAVE_LOG]: 'leaveLogChannel',
  [LOG_CHANNELS_NAMES.SERVER_LOG]: 'serverLogChannel',
};

export const BOT_COMMANDS = {
  BAN: 'ban',
  HBAN: 'hban',
  UNBAN: 'unban',
  HUNBAN: 'hunban',
  SETUP: 'setup',
  TIMEOUT: 'timeout',
  REMOVE_TIMEOUT: 'removetimeout',
  WARN: 'warn',
  JAIL: 'jail',
  BAIL: 'bail',
  ROLE: 'role',
  REMOVE_ROLE: 'removerole',
  REMOVE_ROLE_ALIAS: 'rrole',
  HELP: 'help',
  KICK: 'kick',
  WHITELIST: 'whitelist',
  WL: 'wl',
  UN_WHITELIST: 'unwhitelist',
  UWL: 'uwl',
  ADD_ADMIN: 'addadmin',
  ADD_MOD: 'addmod',
  ADD_ADMIN_ROLE: 'addadminrole',
  ADD_MOD_ROLE: 'addmodrole',
  REMOVE_ADMIN: 'removeadmin',
  REMOVE_MOD: 'removemod',
  REMOVE_ADMIN_ROLE: 'removeadminrole',
  REMOVE_MOD_ROLE: 'removemodrole',
  PURGE: 'purge',
  CLEAR: 'clear',
  MUTE: 'mute',
  UNMUTE: 'unmute',
  SET_CHANNEL: 'setchannel',
  VANITY: 'vanity',
  SET_AUTOROLE: 'setautorole',
  AVATAR: 'avatar',
  AVATAR_ALIAS: 'av',
  SERVER_BANNER: 'serverbanner',
  SERVER_BANNER_ALIAS: 'sb',
  SERVER_AVATAR: 'serveravatar',
  SERVER_AVATAR_ALIAS: 'sav',
  BANNER: 'banner',
  MEMBER_COUNT: 'membercount',
  MEMBER_COUNT_ALIAS: 'mc',
  NICKNAME: 'nick',
  SET_NICKNAME: 'setnickname',
  SET_PREFIX: 'setprefix',
  SET_SECOND_OWNER: 'setsecondowner',
  SET_ADMIN: 'setadmin',
  REMOVE_SET_ADMIN: 'removesetadmin',
  PURGE_LINK: 'purgelink',
  SERVER_INFO: 'serverinfo',
  OFFICIALS: 'officials',
  SERVER_INFO_ALIAS: 'si',
  USER_INFO: 'userinfo',
  USER_INFO_ALIAS: 'ui',
  USER_MESSAGE_COUNT: 'messagecount',
  LOCK_CHANNEL: 'lockchannel',
  LC: 'lc',
  UNLOCK_CHANNEL: 'unlockchannel',
  ULC: 'ulc',
  MEDIA_ONLY: 'mediaonly',
  MO: 'mo',
  ANTI_LINK: 'bypassanitylink',
  AL: 'bal',
  UNSET_MEDIA_ONLY: 'unsetmediaonly',
  UMO: 'umo',
  UNSET_ANTI_LINK_CHANNEL: 'unsetanitylink',
  UAL: 'ual',
  PLAY: 'play',
  LOCK_DOWN: 'lockdown',
  PING: 'ping',
  AFK: 'afk',
  SET_MENTION_LIMIT: 'setmentionlimit',
  AUTO_VC_CREATE: 'autovccreate',
  AUTO_VC_CREATE_ALIAS: 'avc',
  AUTO_VC_TEMPLATE: 'autovoicetemplate',
  AUTO_VC_TEMPLATE_ALIAS: 'avt',
  AUTO_VC_GET_VC_OWNER: 'vcowner',
  MOVE_ALL_MEMBERS: 'vcmoveall',
  SNIPE: 'snipe',
  SPAM_WHITELIST: 'spamwhitelist',
  SPAM_WHITELIST_ALIAS: 'spamwl',
  REMOVE_SPAM_WHITELIST: 'removespamwhitelist',
  REMOVE_SPAM_WHITELIST_ALIAS: 'rspamwl',
  SECURITY_SCAN: 'scan',
  SERVER_BACKUP: 'serverbackup',
  SERVER_BACKUP_RESTORE: 'serverbackuprestore',
  REGISTER: 'register',
  SERVER_CONFIG: 'serverconfig',
  JAILED_USERS_LIST: 'jailedusers',
  AUDIT_LOGS: 'logs',
  TOP_MESSAGES: 'topmessages',
  WHITELISTED: 'whitelisted',
  INVITES: 'invites',
};

export const SELECT_INTERACTION_COMMAND_ID = {};

export const CHANNEL_ACTION_TYPE = {
  CHANNEL_CREATE: 'CHANNEL_CREATE',
  CHANNEL_DELETE: 'CHANNEL_DELETE',
  CHANNEL_UPDATE: 'CHANNEL_UPDATE',

  MEMBER_KICK: 'MEMBER_KICK',
  MEMBER_BAN_ADD: 'MEMBER_BAN_ADD',
  MEMBER_BAN_REMOVE: 'MEMBER_BAN_REMOVE',
  MEMBER_PRUNE: 'MEMBER_PRUNE',
  MEMBER_UPDATE: 'MEMBER_UPDATE',
  MEMBER_ROLE_UPDATE: 'MEMBER_ROLE_UPDATE',

  ROLE_CREATE: 'ROLE_CREATE',
  ROLE_UPDATE: 'ROLE_UPDATE',
  ROLE_DELETE: 'ROLE_DELETE',

  GUILD_UPDATE: 'GUILD_UPDATE',

  WEBHOOK_CREATE: 'WEBHOOK_CREATE',
  WEBHOOK_UPDATE: 'WEBHOOK_UPDATE',
  WEBHOOK_DELETE: 'WEBHOOK_DELETE',

  BOT_ADD: 'BOT_ADD',
  INTEGRATION_CREATE: 'INTEGRATION_CREATE',
  INTEGRATION_UPDATE: 'INTEGRATION_UPDATE',
  INTEGRATION_DELETE: 'INTEGRATION_DELETE',

  EMOJI_CREATE: 'EMOJI_CREATE',
  EMOJI_UPDATE: 'EMOJI_UPDATE',
  EMOJI_DELETE: 'EMOJI_DELETE',

  INVITE_CREATE: 'INVITE_CREATE',
  INVITE_UPDATE: 'INVITE_UPDATE',
  INVITE_DELETE: 'INVITE_DELETE',
};

export const SELECT_INTERACTIONS = {
  SELECT_LIMIT_AVC: 'select-limit-avc',
  SELECT_PRIVACY_AVC: 'select-privacy-avc',
};

export const BUTTON_INTERACTIONS = {
  CREATE_AVC: 'create-vc',
};
export const TEXT_INPUT_INTERACTIONS = {
  CREATE_AVC: 'create-vc',
  CHANNEL_NAME_INPUT: 'channel-name-input',
  CHANNEL_LIMIT_INPUT: 'channel-limit-input', // assuming user inputs a number
  CHANNEL_PRIVACY_INPUT: 'channel-privacy-input', // assuming user inputs 'public' or 'private'
};

export const MODAL_INTERACTIONS = {
  CREATE_AVC: 'create-vc-modal',
};
export const CHANNEL_TYPE_INPUT = {
  PRIVATE: 'private',
  PUBLIC: 'public',
};
