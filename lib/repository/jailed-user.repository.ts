import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JailedUser, JailedUserDocument } from 'lib/models/jailedUser.schema';

@Injectable()
export class JailedUserRepository {
  constructor(
    @InjectModel(JailedUser.name)
    private jailedUserModel: Model<JailedUserDocument>,
  ) {}

  async create(
    memberId: string,
    guildId: string,
    roles: string[],
  ): Promise<JailedUser> {
    const filter = { memberId, guildId };
    const update = { roles };
    const options = { new: true, upsert: true, setDefaultsOnInsert: true };

    const jailedUser = await this.jailedUserModel.findOneAndUpdate(
      filter,
      update,
      options,
    );

    return jailedUser;
  }

  async getJailedUsers(guildId: string) {
    return await this.jailedUserModel.find({ guildId }) || [];
  }

  async remove(memberId: string, guildId: string): Promise<boolean> {
    return this.deleteJailedUser(memberId, guildId);
  }

  async findByGuildIdAndMemberId(
    memberId: string,
    guildId: string,
  ): Promise<JailedUser | null> {
    return await this.jailedUserModel.findOne({ memberId, guildId });
  }

  async deleteJailedUser(memberId: string, guildId: string): Promise<boolean> {
    const result = await this.jailedUserModel.deleteOne({ memberId, guildId });
    return result.deletedCount > 0;
  }

  async retrievePreviousRoles(
    memberId: string,
    guildId: string,
  ): Promise<string[]> {
    const jailedUser = await this.findByGuildIdAndMemberId(memberId, guildId);
    if (jailedUser) {
      return jailedUser.roles;
    }
    return [];
  }
}
