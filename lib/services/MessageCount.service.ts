// lib/services/dailyMessageCount.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  DailyMessageCount,
  DailyMessageCountDocument,
} from 'lib/models/messageCount.schema';
import { Model } from 'mongoose';

@Injectable()
export class DailyMessageCountService {
  private readonly logger = new Logger(DailyMessageCountService.name);

  constructor(
    @InjectModel(DailyMessageCount.name)
    private dailyMessageCountModel: Model<DailyMessageCountDocument>,
  ) {}

  async incrementMessageCount(
    userId: string,
    guildId: string,
    date: Date = new Date(),
  ): Promise<void> {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    await this.dailyMessageCountModel.updateOne(
      { userId, guildId, date: startOfDay },
      { $inc: { count: 1 } },
      { upsert: true },
    );
  }

  async getMessageCount(
    userId: string,
    guildId: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    const result = await this.dailyMessageCountModel.aggregate([
      {
        $match: {
          userId: userId,
          guildId: guildId,
          date: { $gte: from, $lte: to },
        },
      },
      { $group: { _id: null, total: { $sum: '$count' } } },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }
  getStartDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(0, 0, 0, 0); // Normalize to start of the day
    return date;
  }

  getLastWeekDate(): Date {
    return this.getStartDate(7);
  }

  getLastMonthDate(): Date {
    return this.getStartDate(30); // Approximation for a month
  }

  getLastYearDate(): Date {
    return this.getStartDate(365); // Does not account for leap years
  }

  async getMessageCountForToday(
    userId: string,
    guildId: string,
  ): Promise<number> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0); // Set to start of today

    const result = await this.dailyMessageCountModel.aggregate([
      {
        $match: {
          userId: userId,
          guildId: guildId,
          date: { $gte: startOfToday },
        },
      },
      { $group: { _id: null, total: { $sum: '$count' } } },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  async getLastOneWeekMessageCount(
    userId: string,
    guildId: string,
  ): Promise<number> {
    const startDate = this.getLastWeekDate();
    return this.getMessageCount(userId, guildId, startDate, new Date());
  }

  async getLastOneMonthMessageCount(
    userId: string,
    guildId: string,
  ): Promise<number> {
    const startDate = this.getLastMonthDate();
    return this.getMessageCount(userId, guildId, startDate, new Date());
  }

  async getLastOneYearMessageCount(
    userId: string,
    guildId: string,
  ): Promise<number> {
    const startDate = this.getLastYearDate();
    return this.getMessageCount(userId, guildId, startDate, new Date());
  }

  async getAllTimeMessageCount(
    userId: string,
    guildId: string,
  ): Promise<number> {
    const farPast = new Date(2000, 0, 1); // Arbitrary early date
    return this.getMessageCount(userId, guildId, farPast, new Date());
  }

  async getTopUsersByMessageCount(guildId: string): Promise<any[]> {
    // Calculate the first day of the current month
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    return this.dailyMessageCountModel
      .aggregate([
        {
          $match: {
            guildId: guildId,
            date: { $gte: startOfMonth },
          },
        },
        {
          $group: {
            _id: '$userId',
            totalMessages: { $sum: '$count' },
          },
        },
        {
          $sort: { totalMessages: -1 },
        },
        {
          $limit: 10,
        },
      ])
      .exec();
  }
}
