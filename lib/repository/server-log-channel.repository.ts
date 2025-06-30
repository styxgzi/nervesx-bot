import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ServerLogChannel,
  ServerLogChannelDocument,
} from '../models/serverLogChannels.schema';
import { ServerLogChannelDTO } from 'lib/dto/server-log.dto';

@Injectable()
export class ServerLogChannelRepository {
  constructor(
    @InjectModel(ServerLogChannel.name)
    private serverLogChannelModel: Model<ServerLogChannelDocument>,
  ) {}

  // Create a new ServerLogChannel
  async create(createDto: ServerLogChannelDTO): Promise<ServerLogChannel> {
    const createdLogChannel = new this.serverLogChannelModel(createDto);
    return createdLogChannel.save();
  }

  // Find or create a ServerLogChannel by Guild ID
  async findOrCreateByGuildId(
    guildId: string,
    createDto: ServerLogChannelDTO,
  ): Promise<ServerLogChannel> {
    let serverLogChannel = await this.serverLogChannelModel
      .findOne({ id: guildId })
      .exec();

    if (!serverLogChannel) {
      serverLogChannel = new this.serverLogChannelModel({
        ...createDto,
        id: guildId,
      });
      await serverLogChannel.save();
    }

    return serverLogChannel;
  }
  // Find a ServerLogChannel by ID
  async findOneByServerId(serverId: string): Promise<ServerLogChannel | null> {
    return this.serverLogChannelModel.findOne({ serverId }).exec();
  }
  // Find a ServerLogChannel by ID
  async findOneById(id: string): Promise<ServerLogChannel | null> {
    return this.serverLogChannelModel.findOne({ id });
  }

  // Update a ServerLogChannel
  async update(id: string, updateDto: any): Promise<ServerLogChannel | null> {
    return this.serverLogChannelModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
  }

  // Delete a ServerLogChannel
  async delete(id: string): Promise<ServerLogChannel | null> {
    return this.serverLogChannelModel.findByIdAndDelete(id).exec();
  }
}
