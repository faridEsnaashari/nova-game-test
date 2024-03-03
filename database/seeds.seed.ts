import * as mongodb from 'mongodb';

const userId = new mongodb.ObjectId();
const walletId = new mongodb.ObjectId();

export default [
  {
    users: [
      {
        _id: userId,
        email: 'john@gmail.com',
        country: 'England',
        postalCode: '24312',
        street: 'Road Avenue',
        role: 'guest',
      },
    ],
  },
  { wallets: [{ _id: walletId, balance: 0, user: userId }] },
];
