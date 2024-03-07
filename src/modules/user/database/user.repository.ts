import { UserRepositoryPort } from './user.repository.port';
import { z } from 'zod';
import { UserMapper } from '../user.mapper';
import { UserRoles } from '../domain/user.types';
import { UserEntity } from '../domain/user.entity';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { MongoRepositoryBase } from '@src/libs/db/mongo-repository.base';
import { ObjectId } from 'mongodb';

/**
 * Runtime validation of user object for extra safety (in case database schema changes).
 * https://github.com/gajus/slonik#runtime-validation
 * If you prefer to avoid performance penalty of validation, use interfaces instead.
 */
export const userSchema = z.object({
  _id: z.string(),
  createdAt: z.preprocess((val: any) => new Date(val), z.date()),
  updatedAt: z.preprocess((val: any) => new Date(val), z.date()),
  email: z.string().email(),
  country: z.string().min(1).max(255),
  postalCode: z.string().min(1).max(20),
  street: z.string().min(1).max(255),
  role: z.nativeEnum(UserRoles),
});

export type UserModel = z.TypeOf<typeof userSchema>;

/**
 *  Repository is used for retrieving/saving domain entities
 * */
@Injectable()
export class UserRepository
  extends MongoRepositoryBase<UserEntity, UserModel>
  implements UserRepositoryPort
{
  protected collectionName = 'users';

  protected schema = userSchema;

  constructor(
    @InjectConnection()
    connection: Connection,
    mapper: UserMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(
      connection,
      'users',
      mapper,
      eventEmitter,
      new Logger(UserRepository.name),
    );
  }

  async updateAddress(user: UserEntity): Promise<void> {
    const address = user.getProps().address;

    //eslint-disable-next-line
    const { equals: _, unpack: __, ...rest } = address;
    await this.collection.findOneAndUpdate(
      { _id: new ObjectId(user.id) },
      { address: rest },
    );
  }

  async findOneByEmail(email: string): Promise<UserEntity> {
    const user = await this.collection.findOne({ email });

    return this.mapper.toDomain(this.schema.parse(user));
  }
}
