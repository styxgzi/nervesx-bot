// invite.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Invite, InviteDocument } from 'lib/models/invite.schema';
import { Model } from 'mongoose';

@Injectable()
export class InviteRepository {
  constructor(
    @InjectModel(Invite.name) private inviteModel: Model<InviteDocument>,
  ) {}

  // Fetch all invites for a guild from the database
  async getAllInvites(guildId: string): Promise<Map<string, Invite>> {
    const invites = await this.inviteModel.find({ guildId }).exec();
    const plainInvitesMap = new Map<string, Invite>();
    invites.forEach((invite) => {
      plainInvitesMap.set(invite.code, invite.toObject() as Invite);
    });
    return plainInvitesMap;
  }

  // Update invite count when a new member uses an invite
  async updateInviteCount(
    guildId: string,
    userId: string,
    code: string,
    uses: number,
  ): Promise<void> {
    await this.inviteModel
      .updateOne(
        { guildId, code },
        { $set: { uses, userId } },
        { upsert: true },
      )
      .exec();
  }

  // Add a new invite to the database when it is created
  async addNewInvite(guildId: string, invite): Promise<void> {
    const newInvite = new this.inviteModel({
      guildId,
      code: invite.code,
      userId: invite.inviter.id,
      uses: invite.uses,
    });
    await newInvite.save();
  }

  // Remove an invite from the database when it is deleted
  async removeInvite(guildId: string, code: string): Promise<void> {
    await this.inviteModel.deleteOne({ guildId, code }).exec();
  }

  // Refresh the invites stored in the database
  async setGuildInvites(guildId: string, invites): Promise<void> {
    // Remove old invites
    await this.inviteModel.deleteMany({ guildId }).exec();
    // Add current active invites
    invites.forEach(async (invite) => {
      await this.addNewInvite(guildId, invite);
    });
  }
  async getTopInvites(guildId: string): Promise<Invite[]> {
    const invites = await this.inviteModel
      .find({ guildId })
      .sort({ uses: -1 })
      .limit(10)
      .exec();

    return invites.map((invite) => invite.toObject() as Invite);
  }
}
