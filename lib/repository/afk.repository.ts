// src/afk/afk.repository.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AfkStatus, AfkStatusDocument } from 'lib/models/afkstatus.schema';
import { Model } from 'mongoose';

@Injectable()
export class AfkRepository {
  constructor(
    @InjectModel(AfkStatus.name)
    private afkStatusModel: Model<AfkStatusDocument>,
  ) {}

  async setAfkStatus(userId: string, message: string): Promise<AfkStatus> {
    const filter = { discordId: userId };
    const options = { new: true, upsert: true, setDefaultsOnInsert: true };
    const update = {
      discordId: userId,
      reason: message,
      timestamp: new Date(),
    };
    const newAfkStatus = await this.afkStatusModel.findOneAndUpdate(
      filter,
      update,
      options,
    );
    return newAfkStatus;
  }

  async removeAfkStatusByUserId(userId: string): Promise<any> {
    return this.afkStatusModel.deleteOne({ discordId: userId });
  }

  async findAfkStatusByUserId(userId: string): Promise<AfkStatus | null> {
    return this.afkStatusModel.findOne({ discordId: userId });
  }
}
