import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

enum SubscriptionPlan {
  BASIC = 'basic',
  PREMIUM = 'premium',
  VIP = 'vip',
}

@Schema()
export class User {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  discordId: string;

  @Prop({ enum: SubscriptionPlan, default: SubscriptionPlan.BASIC })
  subscriptionPlan: SubscriptionPlan;
}

export const UserSchema = SchemaFactory.createForClass(User);
