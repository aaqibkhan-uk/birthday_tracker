// Places a (mock) order for an approved card (FR-6.4, FR-6.6). No real payment happens.
import { buildOrderInput, getCardIncompleteReason, type Destination } from '../domain/checkout';
import { getEstimatedDelivery } from '../domain/delivery';
import type { Order } from '../domain/models';
import type { Repos } from '../db/repositories';
import { copyImageForOrder, deleteImages } from './fileStorage';

/**
 * Order of steps matters:
 * 1. copy the selected design to a stable path (the order's own snapshot),
 * 2. save the order and mark the card ordered in one transaction,
 * 3. discard the card's unselected designs (FR-4.11).
 * If step 2 fails, the copy from step 1 is removed so nothing is left behind.
 */
export async function placeOrder(
  { cardsRepo, designsRepo, ordersRepo }: Pick<Repos, 'cardsRepo' | 'designsRepo' | 'ordersRepo'>,
  args: { cardId: number; destination: Destination; email: string; now: Date },
): Promise<Order> {
  const { cardId, destination, email, now } = args;
  const card = await cardsRepo.getById(cardId);
  if (!card) throw new Error(`Card ${cardId} not found`);
  if (card.status !== 'approved') throw new Error(`Card ${cardId} is ${card.status}, not approved`);
  const selected = await designsRepo.getSelected(cardId);
  const incomplete = getCardIncompleteReason(card, selected !== null);
  if (incomplete || !selected) throw new Error(incomplete ?? 'No design selected');

  const imagePath = await copyImageForOrder(cardId, selected.imagePath);
  let order: Order;
  try {
    order = await ordersRepo.create(
      buildOrderInput({
        card,
        destination,
        imagePath,
        email,
        estimatedDelivery: getEstimatedDelivery(now),
      }),
    );
  } catch (error) {
    deleteImages([imagePath]);
    throw error;
  }

  try {
    const { deletedImagePaths } = await designsRepo.deleteUnselected(cardId);
    deleteImages(deletedImagePaths);
  } catch (error) {
    // The order is placed; leftover designs only cost a little disk space.
    console.warn('Could not discard unused designs', error);
  }
  return order;
}
