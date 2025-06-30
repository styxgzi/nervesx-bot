import { Injectable } from '@nestjs/common';
import { RedisService } from 'lib/services/Redis.service';

@Injectable()
export class VoiceChannelOwnersService {
  constructor(private redisService: RedisService) {}

  async setOwner(channelId: string, userId: string): Promise<boolean> {
    return this.redisService.set(`voiceChannelOwner:${channelId}`, userId);
  }

  async getOwner(channelId: string): Promise<string | null> {
    return this.redisService.get<string>(`voiceChannelOwner:${channelId}`);
  }

  async removeChannel(channelId: string): Promise<boolean> {
    return this.redisService.del(`voiceChannelOwner:${channelId}`);
  }

  async transferOwnership(
    channelId: string,
    newOwnerId: string,
  ): Promise<boolean> {
    const currentOwner = await this.getOwner(channelId);
    if (currentOwner) {
      return this.setOwner(channelId, newOwnerId);
    }
    return false; // Return false if no current owner exists to transfer from
  }
}
