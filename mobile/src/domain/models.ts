// Entity types for cards, designs, orders and the user profile (CLAUDE.md §9).
// Friend lives in ./friend.ts with its validation. No React or Expo imports.

export const CARD_STATUSES = ['draft', 'approved', 'ordered'] as const;
export type CardStatus = (typeof CARD_STATUSES)[number];

export interface Card {
  id: number;
  friendId: number | null;
  status: CardStatus;
  artPrompt: string | null;
  style: string | null;
  frontText: string | null;
  insideMessage: string | null;
  generationsUsed: number;
  createdAt: string;
  updatedAt: string;
}

export type CardContent = Pick<Card, 'artPrompt' | 'style' | 'frontText' | 'insideMessage'>;

export interface CardDesign {
  id: number;
  cardId: number;
  generationRound: number;
  promptUsed: string;
  imagePath: string;
  isSelected: boolean;
  createdAt: string;
}

export type DestinationType = 'friend' | 'self';

export interface Order {
  id: number;
  cardId: number;
  destinationType: DestinationType;
  recipientName: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postcode: string;
  imagePath: string;
  frontText: string | null;
  insideMessage: string;
  confirmationEmail: string;
  pricePence: number;
  /** ISO date, e.g. "2026-11-02". */
  estimatedDeliveryDate: string;
  status: string;
  createdAt: string;
}

export type OrderInput = Omit<Order, 'id' | 'status' | 'createdAt'>;

export interface UserProfile {
  name: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  notificationsPrompted: boolean;
}
