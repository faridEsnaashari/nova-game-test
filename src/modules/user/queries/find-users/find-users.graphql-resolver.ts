import { QueryBus } from '@nestjs/cqrs';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Result } from 'oxide.ts';
import { ResponseBase } from '../../../../libs/api/response.base';
import { Paginated } from '../../../../libs/ddd';
import { PaginatedParams } from '../../../../libs/ddd/query.base';
import { UserPaginatedGraphqlResponseDto } from '../../dtos/graphql/user.paginated-gql-response.dto';
import { FindUsersQuery } from './find-users.query-handler';
import { UserEntity } from '../../domain/user.entity';

@Resolver()
export class FindUsersGraphqlResolver {
  constructor(private readonly queryBus: QueryBus) {}
  @Query(() => UserPaginatedGraphqlResponseDto)
  async findUsers(
    @Args('options', { type: () => String })
    options: PaginatedParams<FindUsersQuery>,
  ): Promise<UserPaginatedGraphqlResponseDto> {
    const query = new FindUsersQuery(options);
    const result: Result<
      Paginated<UserEntity>,
      Error
    > = await this.queryBus.execute(query);

    const paginated = result.unwrap();
    const response = new UserPaginatedGraphqlResponseDto({
      ...paginated,
      data: paginated.data.map((user) => ({
        ...new ResponseBase(user),
        email: user.getProps().email,
        country: user.getProps().address.country,
        street: user.getProps().address.street,
        postalCode: user.getProps().address.postalCode,
      })),
    });
    return response;
  }
}
