// redis.service.ts
import { Injectable, Logger } from '@nestjs/common';
import Redis, { Redis as RedisClient } from 'ioredis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClient;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT, 10),
      password: process.env.REDIS_PASSWORD,
    });

    this.client.on('connect', () => this.logger.log('Connected to Redis.'));
    this.client.on('error', (error) => this.logger.error('Redis Error', error));
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      this.logger.error(`Failed to get key ${key} from Redis`, error);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    expireSeconds?: number,
  ): Promise<boolean> {
    try {
      const valueString = JSON.stringify(value);
      if (expireSeconds) {
        await this.client.setex(key, expireSeconds, valueString);
      } else {
        await this.client.set(key, valueString);
      }
      return true;
    } catch (error) {
      this.logger.error(`Failed to set key ${key} in Redis`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete key ${key} from Redis`, error);
      return false;
    }
  }
  async incrementWithExpiry(key: string, expiry: number): Promise<number> {
    const result = await this.client
      .multi()
      .incr(key)
      .expire(key, expiry)
      .exec();

    // Assuming result[0][1] is the increment operation result
    const incrementResult = result[0][1];

    if (typeof incrementResult === 'number') {
      return incrementResult;
    } else {
      throw new Error('Expected a number from Redis INCR command');
    }
  }
}
