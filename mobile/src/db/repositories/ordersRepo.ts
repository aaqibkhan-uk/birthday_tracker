import type { DestinationType, Order, OrderInput } from '../../domain/models';
import { expectOneRow, nowIso, type Db } from '../database';

interface OrderRow {
  id: number;
  card_id: number;
  destination_type: DestinationType;
  recipient_name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  postcode: string;
  image_path: string;
  front_text: string | null;
  inside_message: string;
  confirmation_email: string;
  price_pence: number;
  estimated_delivery_date: string;
  status: string;
  created_at: string;
}

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    cardId: row.card_id,
    destinationType: row.destination_type,
    recipientName: row.recipient_name,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    postcode: row.postcode,
    imagePath: row.image_path,
    frontText: row.front_text,
    insideMessage: row.inside_message,
    confirmationEmail: row.confirmation_email,
    pricePence: row.price_pence,
    estimatedDeliveryDate: row.estimated_delivery_date,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function createOrdersRepo(db: Db) {
  async function getById(id: number): Promise<Order | null> {
    const row = await db.getFirstAsync<OrderRow>('SELECT * FROM orders WHERE id = ?', [id]);
    return row ? toOrder(row) : null;
  }

  return {
    getById,

    async getByCardId(cardId: number): Promise<Order | null> {
      const row = await db.getFirstAsync<OrderRow>('SELECT * FROM orders WHERE card_id = ?', [
        cardId,
      ]);
      return row ? toOrder(row) : null;
    },

    /** Newest first. */
    async list(): Promise<Order[]> {
      const rows = await db.getAllAsync<OrderRow>(
        'SELECT * FROM orders ORDER BY created_at DESC, id DESC',
        [],
      );
      return rows.map(toOrder);
    },

    /**
     * Saves the order snapshot and marks the card ordered (read-only) in one transaction.
     * `input.imagePath` must already be a stable copy of the selected design (CLAUDE.md §9).
     */
    async create(input: OrderInput): Promise<Order> {
      let id = 0;
      await db.withTransactionAsync(async () => {
        const result = await db.runAsync(
          `INSERT INTO orders (card_id, destination_type, recipient_name, address_line1,
             address_line2, city, postcode, image_path, front_text, inside_message,
             confirmation_email, price_pence, estimated_delivery_date, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            input.cardId,
            input.destinationType,
            input.recipientName,
            input.addressLine1,
            input.addressLine2,
            input.city,
            input.postcode,
            input.imagePath,
            input.frontText,
            input.insideMessage,
            input.confirmationEmail,
            input.pricePence,
            input.estimatedDeliveryDate,
            nowIso(),
          ],
        );
        id = result.lastInsertRowId;
        expectOneRow(
          await db.runAsync(`UPDATE cards SET status = 'ordered', updated_at = ? WHERE id = ?`, [
            nowIso(),
            input.cardId,
          ]),
          `Mark card ${input.cardId} ordered`,
        );
      });
      const order = await getById(id);
      if (!order) throw new Error(`Order ${id} not found after insert`);
      return order;
    },
  };
}

export type OrdersRepo = ReturnType<typeof createOrdersRepo>;
