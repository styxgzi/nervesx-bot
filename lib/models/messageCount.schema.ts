// lib/models/dailyMessageCount.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DailyMessageCountDocument = DailyMessageCount & Document;

@Schema()
export class DailyMessageCount {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  guildId: string;

  @Prop({ required: true })
  date: Date; // This will store only the date part (YYYY-MM-DD)

  @Prop({ required: true, default: 0 })
  count: number;
}

export const DailyMessageCountSchema = SchemaFactory.createForClass(DailyMessageCount);
