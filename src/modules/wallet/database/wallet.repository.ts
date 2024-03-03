import { z } from 'zod';
import { WalletRepositoryPort } from './wallet.repository.port';
import { WalletEntity } from '../domain/wallet.entity';
import { WalletMapper } from '../wallet.mapper';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MongoRepositoryBase } from '@src/libs/db/mongo-repository.base';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

export const walletSchema = z.object({
  _id: z.string().min(1).max(255),
  createdAt: z.preprocess((val: any) => new Date(val), z.date()),
  updatedAt: z.preprocess((val: any) => new Date(val), z.date()),
  balance: z.number().min(0).max(9999999),
  userId: z.string().min(1).max(255),
});

export type WalletModel = z.TypeOf<typeof walletSchema>;

@Injectable()
export class WalletRepository
  extends MongoRepositoryBase<WalletEntity, WalletModel>
  implements WalletRepositoryPort
{
  protected tableName = 'wallets';

  protected schema = walletSchema;

  constructor(
    @InjectConnection()
    connection: Connection,
    mapper: WalletMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(
      connection,
      'users',
      mapper,
      eventEmitter,
      new Logger(WalletRepository.name),
    );
  }
}
