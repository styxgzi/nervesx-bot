import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InviteDocument = Invite & Document;

@Schema()
export class Invite {
  @Prop({ required: true })
  guildId: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  uses: number;
}

export const InviteSchema = SchemaFactory.createForClass(Invite);
