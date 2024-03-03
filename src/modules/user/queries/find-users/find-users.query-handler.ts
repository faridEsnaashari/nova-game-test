import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { PaginatedParams, PaginatedQueryBase } from '@libs/ddd/query.base';
import { Paginated } from '@src/libs/ddd';
import { UserEntity } from '../../domain/user.entity';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { UserMapper } from '../../user.mapper';

export class FindUsersQuery extends PaginatedQueryBase {
  readonly country?: string;

  readonly postalCode?: string;

  readonly street?: string;

  constructor(props: PaginatedParams<FindUsersQuery>) {
    super(props);
    this.country = props.country;
    this.postalCode = props.postalCode;
    this.street = props.street;
  }
}

@QueryHandler(FindUsersQuery)
export class FindUsersQueryHandler implements IQueryHandler {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    private userMapper: UserMapper,
  ) {}

  /**
   * In read model we don't need to execute
   * any business logic, so we can bypass
   * domain and repository layers completely
   * and execute query directly
   */
  async execute(
    query: FindUsersQuery,
  ): Promise<Result<Paginated<UserEntity>, Error>> {
    /**
     * Constructing a query with Slonik.
     * More info: https://contra.com/p/AqZWWoUB-writing-composable-sql-using-java-script
     */
    const collection = this.connection.db.collection('users');

    const or: Record<string, unknown>[] = [];
    query.country && or.push({ country: query.country });
    query.street && or.push({ street: query.street });
    query.postalCode && or.push({ postalCode: query.postalCode });

    const q = or.length > 0 ? { $or: or } : {};

    const result: any = [];
    const cursor = collection.find(q);
    for await (const doc of cursor) {
      result.push(doc);
    }
    //TODO add pagination in query

    return Ok(
      new Paginated({
        data: result.map(this.userMapper.toDomain),
        count: result.length,
        limit: query.limit,
        page: query.page,
      }),
    );
  }
}
