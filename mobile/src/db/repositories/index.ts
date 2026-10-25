import type { Db } from '../database';
import { createCardsRepo } from './cardsRepo';
import { createDesignsRepo } from './designsRepo';
import { createFriendsRepo } from './friendsRepo';
import { createOrdersRepo } from './ordersRepo';
import { createProfileRepo } from './profileRepo';

export function createRepos(db: Db) {
  return {
    friendsRepo: createFriendsRepo(db),
    cardsRepo: createCardsRepo(db),
    designsRepo: createDesignsRepo(db),
    ordersRepo: createOrdersRepo(db),
    profileRepo: createProfileRepo(db),
  };
}

export type Repos = ReturnType<typeof createRepos>;
