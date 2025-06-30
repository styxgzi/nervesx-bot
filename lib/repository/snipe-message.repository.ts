// snipe-message.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  SnipeMessage,
  SnipeMessageDocument,
} from 'lib/models/snipe-message.schema';
import { Model } from 'mongoose';

@Injectable()
export class SnipeMessageRepository {
  constructor(
    @InjectModel(SnipeMessage.name)
    private snipeMessageModel: Model<SnipeMessageDocument>,
  ) {}

  async addSnipeMessage(snipeMessage: SnipeMessage): Promise<SnipeMessage> {
    const newSnipeMessage = new this.snipeMessageModel(snipeMessage);
    return newSnipeMessage.save();
  }

  async getSnipeMessages(
    channelId: string,
    guildId: string,
    limit: number,
  ): Promise<SnipeMessage[]> {
    return this.snipeMessageModel
      .find({ channelId, guildId })
      .sort({ time: -1 })
      .limit(limit)
      .exec();
  }

  async delete(channelId: string, guildId: string) {
    return this.snipeMessageModel.deleteOne({ channelId, guildId }).exec();
  }

  // Add other necessary methods here
}
