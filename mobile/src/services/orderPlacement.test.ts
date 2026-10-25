import type { Destination } from '../domain/checkout';
import { createRepos, type Repos } from '../db/repositories';
import { createTestDb } from '../db/testDb';
import { copyImageForOrder, deleteImages } from './fileStorage';
import { placeOrder } from './orderPlacement';

jest.mock('./fileStorage', () => ({
  copyImageForOrder: jest.fn(async (cardId: number) => `orders/card-${cardId}.png`),
  deleteImages: jest.fn(),
}));

const destination: Destination = {
  type: 'friend',
  recipientName: 'Sam',
  addressLine1: '1 High St',
  addressLine2: null,
  city: 'Leeds',
  postcode: 'LS1 1BA',
};
// Monday 26 Oct 2026 → estimated delivery Monday 2 Nov.
const NOW = new Date(2026, 9, 26, 10);

let repos: Repos;
let cardId: number;
let friendId: number;

beforeEach(async () => {
  jest.clearAllMocks();
  repos = createRepos(await createTestDb());
  friendId = (
    await repos.friendsRepo.create({
      name: 'Sam',
      birthDay: 3,
      birthMonth: 1,
      birthYear: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      postcode: null,
      reminderOffsetDays: 7,
    })
  ).id;
  cardId = (await repos.cardsRepo.create(friendId)).id;
  const designs = await repos.designsRepo.addRound(cardId, 1, 'a fox', [
    'designs/a.png',
    'designs/b.png',
    'designs/c.png',
  ]);
  await repos.designsRepo.select(cardId, designs[1]!.id);
  await repos.cardsRepo.updateContent(cardId, { frontText: 'Hi Sam', insideMessage: 'Have fun' });
  await repos.cardsRepo.setStatus(cardId, 'approved');
});

const place = () => placeOrder(repos, { cardId, destination, email: 'me@example.com', now: NOW });

describe('placeOrder', () => {
  it('snapshots the order, marks the card ordered and discards unused designs', async () => {
    const order = await place();

    expect(copyImageForOrder).toHaveBeenCalledWith(cardId, 'designs/b.png');
    expect(order).toMatchObject({
      cardId,
      recipientName: 'Sam',
      imagePath: `orders/card-${cardId}.png`,
      frontText: 'Hi Sam',
      insideMessage: 'Have fun',
      pricePence: 399,
      estimatedDeliveryDate: '2026-11-02',
      status: 'confirmed',
    });
    expect((await repos.cardsRepo.getById(cardId))?.status).toBe('ordered');
    expect((await repos.designsRepo.listByCard(cardId)).map((d) => d.imagePath)).toEqual([
      'designs/b.png',
    ]);
    expect(deleteImages).toHaveBeenCalledWith(['designs/a.png', 'designs/c.png']);
  });

  it('keeps the order when the friend is deleted later', async () => {
    const order = await place();
    await repos.friendsRepo.delete(friendId);
    expect(await repos.ordersRepo.getById(order.id)).toEqual(order);
  });

  it('refuses a card that is not approved, without copying anything', async () => {
    await repos.cardsRepo.updateContent(cardId, { insideMessage: 'Changed' }); // back to draft
    await expect(place()).rejects.toThrow(/not approved/);
    expect(copyImageForOrder).not.toHaveBeenCalled();
  });

  it('removes the copied image if saving the order fails', async () => {
    jest.spyOn(repos.ordersRepo, 'create').mockRejectedValueOnce(new Error('disk full'));
    await expect(place()).rejects.toThrow('disk full');
    expect(deleteImages).toHaveBeenCalledWith([`orders/card-${cardId}.png`]);
    expect((await repos.cardsRepo.getById(cardId))?.status).toBe('approved');
  });

  it('cannot order the same card twice', async () => {
    await place();
    await expect(place()).rejects.toThrow();
    expect(await repos.ordersRepo.list()).toHaveLength(1);
  });
});
