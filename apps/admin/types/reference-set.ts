/** Mirrors the `reference_sets` table. */

export type ReferenceSetStatus = "active" | "archived";

export interface ReferenceSet {
  id: string;
  characterId: string;
  name: string;
  description?: string;
  tags: string[];
  itemCount: number;
  status: ReferenceSetStatus;
  createdAt: string;
}
