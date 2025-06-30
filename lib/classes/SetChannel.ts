import { Injectable } from '@nestjs/common';
import { ChannelType } from 'discord.js';

@Injectable()
export class SetChannelService {
  constructor() {}
  setChannel(channelType: ChannelType, channel: string) {}
}
