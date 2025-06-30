import {
  IsString,
  IsDate,
  IsOptional,
  IsEnum,
  IsMongoId,
  IsArray,
} from 'class-validator';
import { SubscriptionPlan } from '../models/server.schema'; // Import the SubscriptionPlan enum

export class ServerDTO {
  @IsString()
  readonly id: string;

  @IsString()
  readonly name: string;

  @IsDate()
  @IsOptional()
  readonly joinedAt?: Date;

  @IsDate()
  @IsOptional()
  readonly subscribedAt?: Date;

  @IsMongoId()
  readonly owner: string;

  @IsArray()
  @IsMongoId({ each: true })
  readonly secondOwners: string[];

  @IsEnum(SubscriptionPlan)
  readonly subscriptionPlan: SubscriptionPlan;
}
