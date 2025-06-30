import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ServerBackup,
  ServerBackupDocument,
} from 'lib/models/server-backup.schema';
import { Model } from 'mongoose';

@Injectable()
export class ServerBackupRepository {
  constructor(
    @InjectModel(ServerBackup.name)
    private serverBackupModel: Model<ServerBackupDocument>,
  ) {}

  async createBackup(backupData: ServerBackup): Promise<ServerBackup> {
    const newBackup = new this.serverBackupModel(backupData);
    return newBackup.save();
  }

  async findBackupByServerId(serverId: string): Promise<ServerBackup | null> {
    return this.serverBackupModel.findOne({ serverId });
  }
  async findBackupById(id: string): Promise<ServerBackup | null> {
    return this.serverBackupModel.findOne({ _id: id });
  }

  async updateBackup(
    serverId: string,
    backupData: Partial<ServerBackup>,
  ): Promise<ServerBackup> {
    const existingBackup = await this.serverBackupModel.findOne({ serverId });
    if (existingBackup) {
      // If backup exists, update it
      return await this.serverBackupModel.findOneAndUpdate(
        { serverId },
        backupData,
        { new: true },
      );
    } else {
      // If no backup exists, create a new record
      const newBackup = new this.serverBackupModel({
        ...backupData,
        serverId, // Ensure serverId is set correctly
      });
      return await newBackup.save();
    }
  }
}
