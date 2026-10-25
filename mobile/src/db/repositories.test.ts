import type { FriendInput } from '../domain/friend';
import type { OrderInput } from '../domain/models';
import type { Db } from './database';
import { getSchemaVersion, migrate, MIGRATIONS } from './migrations';
import { createRepos, type Repos } from './repositories';
import { createTestDb } from './testDb';

const friendInput = (overrides: Partial<FriendInput> = {}): FriendInput => ({
  name: 'Sam',
  birthDay: 3,
  birthMonth: 1,
  birthYear: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  postcode: null,
  reminderOffsetDays: 7,
  ...overrides,
});

const orderInput = (cardId: number): OrderInput => ({
  cardId,
  destinationType: 'friend',
  recipientName: 'Sam',
  addressLine1: '1 High St',
  addressLine2: null,
  city: 'Leeds',
  postcode: 'LS1 1BA',
  imagePath: 'file:///orders/1.png',
  frontText: 'Happy birthday',
  insideMessage: 'Have a great day',
  confirmationEmail: 'me@example.com',
  pricePence: 399,
  estimatedDeliveryDate: '2026-11-02',
});

let db: Db;
let repos: Repos;

beforeEach(async () => {
  db = await createTestDb();
  repos = createRepos(db);
});

describe('migrations', () => {
  it('brings a new database to the latest version with a profile row', async () => {
    expect(await getSchemaVersion(db)).toBe(MIGRATIONS.length);
    expect(await repos.profileRepo.get()).toMatchObject({
      name: null,
      notificationsPrompted: false,
    });
  });

  it('is a no-op when already up to date', async () => {
    await migrate(db);
    expect(await getSchemaVersion(db)).toBe(MIGRATIONS.length);
  });

  it('enforces foreign keys', async () => {
    await expect(repos.designsRepo.addRound(999, 1, 'fox', ['file:///a.png'])).rejects.toThrow(
      /FOREIGN KEY/,
    );
  });

  it('rolls back a failed migration and leaves the version unchanged', async () => {
    const broken = [...MIGRATIONS, 'CREATE TABLE extra (id INTEGER); NOT VALID SQL;'];
    await expect(migrate(db, broken)).rejects.toThrow();
    expect(await getSchemaVersion(db)).toBe(MIGRATIONS.length);
    expect(
      await db.getFirstAsync("SELECT name FROM sqlite_master WHERE name = 'extra'", []),
    ).toBeNull();
  });

  it('refuses to run against a newer database', async () => {
    await db.execAsync(`PRAGMA user_version = ${MIGRATIONS.length + 1}`);
    await expect(migrate(db)).rejects.toThrow(/newer/);
  });
});

describe('friendsRepo', () => {
  it('creates, reads, updates and lists friends', async () => {
    const { friendsRepo } = repos;
    const created = await friendsRepo.create(friendInput({ birthYear: 1990 }));
    expect(created).toMatchObject({ id: expect.any(Number), name: 'Sam', birthYear: 1990 });
    expect(await friendsRepo.getById(created.id)).toEqual(created);

    const updated = await friendsRepo.update(
      created.id,
      friendInput({ name: 'Samira', reminderOffsetDays: 14, city: 'Leeds' }),
    );
    expect(updated).toMatchObject({ name: 'Samira', reminderOffsetDays: 14, city: 'Leeds' });
    expect(updated.createdAt).toBe(created.createdAt);

    await friendsRepo.create(friendInput({ name: 'alex' }));
    expect((await friendsRepo.list()).map((f) => f.name)).toEqual(['alex', 'Samira']);
  });

  it('rejects values outside the schema checks', async () => {
    await expect(repos.friendsRepo.create(friendInput({ birthMonth: 13 }))).rejects.toThrow(
      /CHECK/,
    );
  });

  it('throws when updating a missing friend', async () => {
    await expect(repos.friendsRepo.update(42, friendInput())).rejects.toThrow(/expected 1 row/);
  });

  it('deletes draft/approved cards and keeps ordered cards with no friend', async () => {
    const { friendsRepo, cardsRepo, designsRepo, ordersRepo } = repos;
    const friend = await friendsRepo.create(friendInput());
    const other = await friendsRepo.create(friendInput({ name: 'Other' }));

    const draft = await cardsRepo.create(friend.id);
    await designsRepo.addRound(draft.id, 1, 'fox', ['file:///d1.png', 'file:///d2.png']);
    const approved = await cardsRepo.create(friend.id);
    await cardsRepo.setStatus(approved.id, 'approved');
    await designsRepo.addRound(approved.id, 1, 'owl', ['file:///a1.png']);
    const ordered = await cardsRepo.create(friend.id);
    await ordersRepo.create(orderInput(ordered.id));
    const othersCard = await cardsRepo.create(other.id);

    const { deletedImagePaths } = await friendsRepo.delete(friend.id);

    expect(deletedImagePaths.sort()).toEqual([
      'file:///a1.png',
      'file:///d1.png',
      'file:///d2.png',
    ]);
    expect(await friendsRepo.getById(friend.id)).toBeNull();
    expect(await cardsRepo.getById(draft.id)).toBeNull();
    expect(await cardsRepo.getById(approved.id)).toBeNull();
    expect(await designsRepo.listByCard(draft.id)).toEqual([]);
    expect(await cardsRepo.getById(ordered.id)).toMatchObject({
      friendId: null,
      status: 'ordered',
    });
    expect(await ordersRepo.getByCardId(ordered.id)).toMatchObject({ recipientName: 'Sam' });
    expect(await cardsRepo.getById(othersCard.id)).toMatchObject({ friendId: other.id });
  });

  it('throws when deleting a missing friend', async () => {
    await expect(repos.friendsRepo.delete(42)).rejects.toThrow(/expected 1 row/);
  });
});

describe('cardsRepo', () => {
  it('starts as a draft and saves content', async () => {
    const { friendsRepo, cardsRepo } = repos;
    const friend = await friendsRepo.create(friendInput());
    const card = await cardsRepo.create(friend.id);
    expect(card).toMatchObject({ status: 'draft', generationsUsed: 0, artPrompt: null });

    const saved = await cardsRepo.updateContent(card.id, { artPrompt: 'a fox', frontText: 'Hi' });
    expect(saved).toMatchObject({ artPrompt: 'a fox', frontText: 'Hi', insideMessage: null });

    const cleared = await cardsRepo.updateContent(card.id, { frontText: null });
    expect(cleared).toMatchObject({ artPrompt: 'a fox', frontText: null });

    expect((await cardsRepo.incrementGenerationsUsed(card.id)).generationsUsed).toBe(1);
  });

  it('finds the friend’s active (unordered) card for "Resume card"', async () => {
    const { friendsRepo, cardsRepo, ordersRepo } = repos;
    const friend = await friendsRepo.create(friendInput());
    expect(await cardsRepo.getActiveForFriend(friend.id)).toBeNull();

    const ordered = await cardsRepo.create(friend.id);
    await ordersRepo.create(orderInput(ordered.id));
    expect(await cardsRepo.getActiveForFriend(friend.id)).toBeNull();

    const draft = await cardsRepo.create(friend.id);
    expect((await cardsRepo.getActiveForFriend(friend.id))?.id).toBe(draft.id);
  });

  it('treats ordered cards as read-only', async () => {
    const { friendsRepo, cardsRepo, ordersRepo } = repos;
    const friend = await friendsRepo.create(friendInput());
    const card = await cardsRepo.create(friend.id);
    await ordersRepo.create(orderInput(card.id));

    await expect(cardsRepo.updateContent(card.id, { artPrompt: 'x' })).rejects.toThrow();
    await expect(cardsRepo.setStatus(card.id, 'draft')).rejects.toThrow();
    await expect(cardsRepo.incrementGenerationsUsed(card.id)).rejects.toThrow();
    await expect(cardsRepo.delete(card.id)).rejects.toThrow();
  });

  it('deletes a draft with its designs', async () => {
    const { friendsRepo, cardsRepo, designsRepo } = repos;
    const card = await cardsRepo.create((await friendsRepo.create(friendInput())).id);
    await designsRepo.addRound(card.id, 1, 'fox', ['file:///1.png']);
    expect(await cardsRepo.delete(card.id)).toEqual({ deletedImagePaths: ['file:///1.png'] });
    expect(await designsRepo.listByCard(card.id)).toEqual([]);
  });
});

describe('designsRepo', () => {
  it('stores rounds, keeps one selection and discards the rest', async () => {
    const { friendsRepo, cardsRepo, designsRepo } = repos;
    const card = await cardsRepo.create((await friendsRepo.create(friendInput())).id);
    const round1 = await designsRepo.addRound(card.id, 1, 'fox', [
      'file:///1.png',
      'file:///2.png',
    ]);
    const round2 = await designsRepo.addRound(card.id, 2, 'owl', ['file:///3.png']);
    expect(round1.map((d) => d.generationRound)).toEqual([1, 1]);
    expect(round2).toHaveLength(1);

    await designsRepo.select(card.id, round1[0].id);
    await designsRepo.select(card.id, round2[0].id);
    const designs = await designsRepo.listByCard(card.id);
    expect(designs.filter((d) => d.isSelected).map((d) => d.id)).toEqual([round2[0].id]);
    expect((await designsRepo.getSelected(card.id))?.imagePath).toBe('file:///3.png');

    const { deletedImagePaths } = await designsRepo.deleteUnselected(card.id);
    expect(deletedImagePaths.sort()).toEqual(['file:///1.png', 'file:///2.png']);
    expect(await designsRepo.listByCard(card.id)).toHaveLength(1);
  });

  it('will not select a design from another card', async () => {
    const { friendsRepo, cardsRepo, designsRepo } = repos;
    const friend = await friendsRepo.create(friendInput());
    const a = await cardsRepo.create(friend.id);
    const b = await cardsRepo.create(friend.id);
    const [design] = await designsRepo.addRound(a.id, 1, 'fox', ['file:///1.png']);
    await expect(designsRepo.select(b.id, design.id)).rejects.toThrow();
  });
});

describe('ordersRepo', () => {
  it('saves a snapshot, marks the card ordered and lists newest first', async () => {
    const { friendsRepo, cardsRepo, ordersRepo } = repos;
    const friend = await friendsRepo.create(friendInput());
    const first = await cardsRepo.create(friend.id);
    const second = await cardsRepo.create(friend.id);

    const order = await ordersRepo.create(orderInput(first.id));
    expect(order).toMatchObject({ ...orderInput(first.id), status: 'confirmed' });
    expect((await cardsRepo.getById(first.id))?.status).toBe('ordered');

    await ordersRepo.create(orderInput(second.id));
    expect((await ordersRepo.list()).map((o) => o.cardId)).toEqual([second.id, first.id]);
  });

  it('allows only one order per card and rolls back the second attempt', async () => {
    const { friendsRepo, cardsRepo, ordersRepo } = repos;
    const card = await cardsRepo.create((await friendsRepo.create(friendInput())).id);
    await ordersRepo.create(orderInput(card.id));
    await expect(ordersRepo.create(orderInput(card.id))).rejects.toThrow(/UNIQUE/);
    expect(await ordersRepo.list()).toHaveLength(1);
  });
});

describe('profileRepo', () => {
  it('updates only the given fields', async () => {
    const { profileRepo } = repos;
    await profileRepo.update({ name: 'Me', email: 'me@example.com' });
    const profile = await profileRepo.update({ city: 'Leeds' });
    expect(profile).toMatchObject({ name: 'Me', email: 'me@example.com', city: 'Leeds' });
  });

  it('records that notifications were prompted', async () => {
    await repos.profileRepo.setNotificationsPrompted(true);
    expect((await repos.profileRepo.get()).notificationsPrompted).toBe(true);
  });
});
