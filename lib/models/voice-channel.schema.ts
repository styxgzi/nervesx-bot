import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VoiceChannelTemplateDocument = VoiceChannelTemplate & Document;

@Schema()
export class VoiceChannelTemplate {
  @Prop({ required: true })
  guildId: string; // ID of the guild where the template is used

  @Prop({ required: true })
  templateName: string; // Name of the template

  @Prop({ required: true })
  templateChannelId: string; // ID of the voice channel used as a template

  @Prop({ required: true, default: "{username}'s-vc" })
  channelNameTemplate: string;

  @Prop()
  generatedChannels: [string];

  @Prop({ required: true })
  createdBy: string; // User ID of the creator of the template
}

export const VoiceChannelTemplateSchema =
  SchemaFactory.createForClass(VoiceChannelTemplate);
