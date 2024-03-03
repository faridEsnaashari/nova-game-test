import { AggregateRoot, PaginatedQueryParams, Paginated } from '@libs/ddd';
import { Mapper } from '@libs/ddd';
import { RepositoryPort } from '@libs/ddd';
import { ConflictException } from '@libs/exceptions';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { None, Option, Some } from 'oxide.ts';
import { ZodObject } from 'zod';
import { LoggerPort } from '../ports/logger.port';
import { ObjectLiteral } from '../types';
import { Connection, Collection, Types } from 'mongoose';
import { ObjectId } from 'mongodb';
import { RequestContextService } from '../application/context/AppRequestContext';

export abstract class MongoRepositoryBase<
  Aggregate extends AggregateRoot<any>,
  DbModel extends ObjectLiteral,
> implements RepositoryPort<Aggregate>
{
  protected abstract schema: ZodObject<any>;

  protected _collection: Collection;

  protected constructor(
    private readonly _connection: Connection,
    protected readonly collectionName: string,
    protected readonly mapper: Mapper<Aggregate, DbModel>,
    protected readonly eventEmitter: EventEmitter2,
    protected readonly logger: LoggerPort,
  ) {}

  async findOneById(id: string): Promise<Option<Aggregate>> {
    const result = await this.collection.findOne({
      _id: new Types.ObjectId(id),
    });
    return result ? Some(this.mapper.toDomain(result.rows[0])) : None;
  }

  async findAll(): Promise<Aggregate[]> {
    const result: any = [];
    const cursor = this.collection.find();
    for await (const doc of cursor) {
      result.push(doc);
    }
    //TODO test
    return result.map(this.mapper.toDomain);
  }

  async findAllPaginated(
    params: PaginatedQueryParams,
  ): Promise<Paginated<Aggregate>> {
    const result: any = [];
    const cursor = this.collection.find();
    for await (const doc of cursor) {
      result.push(doc);
    }
    //TODO test

    const count = await this.collection.countDocuments();

    const entities = result.map(this.mapper.toDomain);
    return new Paginated({
      data: entities,
      count,
      limit: params.limit,
      page: params.page,
    });
  }

  async delete(entity: Aggregate): Promise<boolean> {
    //TODO validate in repo? ://
    entity.validate();

    this.logger.debug(
      `[${RequestContextService.getRequestId()}] deleting entities ${
        entity.id
      } from ${this.collectionName}`,
    );

    const result = await this.collection.findOneAndDelete({
      _id: new ObjectId(entity.id),
    });

    await entity.publishEvents(this.logger, this.eventEmitter);

    return !!result;
  }

  /**
   * Inserts an entity to a database
   * (also publishes domain events and waits for completion)
   */
  async insert(entity: Aggregate | Aggregate[]): Promise<void> {
    const entities = Array.isArray(entity) ? entity : [entity];

    const records = entities.map(this.mapper.toPersistence);

    try {
      await this.writeQuery(records, entities);
    } catch (error) {
      if ((error as Error).name === 'MongoBulkWriteError') {
        this.logger.debug(
          `[${RequestContextService.getRequestId()}] ${(error as Error).name}`,
        );
        throw new ConflictException('Record already exists', error as Error);
      }
      throw error;
    }
  }

  /**
   * Utility method for write queries when you need to mutate an entity.
   * Executes entity validation, publishes events,
   * and does some debug logging.
   * For read queries use `this.pool` directly
   */
  protected async writeQuery(
    records: DbModel[],
    entity: Aggregate | Aggregate[],
  ): Promise<void> {
    //TODO refactor this function
    const entities = Array.isArray(entity) ? entity : [entity];
    entities.forEach((entity) => entity.validate());
    const entityIds = entities.map((e) => e.id);

    this.logger.debug(
      `[${RequestContextService.getRequestId()}] writing ${
        entities.length
      } entities to "${this.collectionName}" table: ${entityIds}`,
    );

    await this.collection.insertMany(records);

    await Promise.all(
      entities.map((entity) =>
        entity.publishEvents(this.logger, this.eventEmitter),
      ),
    );
  }

  /**
   * start a global transaction to save
   * results of all event handlers in one operation
   */
  public async transaction<T>(handler: () => Promise<T>): Promise<T> {
    const session = await this.connection.startSession();
    return session.withTransaction(async () => {
      this.logger.debug(
        `[${RequestContextService.getRequestId()}] transaction started`,
      );
      if (!RequestContextService.getTransactionConnection()) {
        RequestContextService.setTransactionConnection(this.connection);
      }

      try {
        const result = await handler();
        this.logger.debug(
          `[${RequestContextService.getRequestId()}] transaction committed`,
        );
        return result;
      } catch (e) {
        this.logger.debug(
          `[${RequestContextService.getRequestId()}] transaction aborted`,
        );
        throw e;
      } finally {
        RequestContextService.cleanTransactionConnection();
      }
    });
  }

  /**
   * Get database pool.
   * If global request transaction is started,
   * returns a transaction pool.
   */
  protected get collection(): Collection {
    return this.connection.db.collection(this.collectionName) as Collection;
  }

  protected get connection(): Connection {
    return (
      RequestContextService.getContext().transactionConnection ??
      this._connection
    );
  }
}
