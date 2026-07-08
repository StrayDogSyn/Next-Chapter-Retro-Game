/**
 * Item & Weapon System - data-driven approach where the Python service
 * generates loot tables and this system consumes them
 */

export type Rarity = "common" | "uncommon" | "rare" | "epic";
export type WeaponType = "sword" | "axe" | "spear" | "mace" | "bow" | "staff";

export interface Item {
  id: string;
  name: string;
  type: WeaponType;
  rarity: Rarity;
  damage: number;
  crit_chance: number;
  value: number;
}

export interface Inventory {
  items: Item[];
  equipped: Item | null;
  maxSlots: number;
}

export class ItemManager {
  private inventory: Inventory = {
    items: [],
    equipped: null,
    maxSlots: 10,
  };

  addItem(item: Item): boolean {
    if (this.inventory.items.length >= this.inventory.maxSlots) {
      return false; // Inventory full
    }
    this.inventory.items.push(item);
    if (!this.inventory.equipped) {
      this.equip(item.id);
    }
    return true;
  }

  removeItem(itemId: string): Item | null {
    const index = this.inventory.items.findIndex((i) => i.id === itemId);
    if (index === -1) return null;

    const item = this.inventory.items[index];
    this.inventory.items.splice(index, 1);

    if (this.inventory.equipped?.id === itemId) {
      this.inventory.equipped =
        this.inventory.items.length > 0 ? this.inventory.items[0] : null;
    }

    return item;
  }

  equip(itemId: string): boolean {
    const item = this.inventory.items.find((i) => i.id === itemId);
    if (!item) return false;

    this.inventory.equipped = item;
    return true;
  }

  getInventory(): Inventory {
    return { ...this.inventory };
  }

  getEquipped(): Item | null {
    return this.inventory.equipped;
  }

  calculateDamage(baseDamage: number = 10): number {
    if (!this.inventory.equipped) return baseDamage;

    const weaponDamage = this.inventory.equipped.damage;
    const critRoll = Math.random();
    const critChance = this.inventory.equipped.crit_chance / 100;

    if (critRoll < critChance) {
      return (baseDamage + weaponDamage) * 1.5; // Critical hit multiplier
    }
    return baseDamage + weaponDamage;
  }

  clear() {
    this.inventory.items = [];
    this.inventory.equipped = null;
  }
}

/**
 * Fetch loot from the Python service and convert to item objects
 */
export async function generateLootFromServer(
  seed: number = Math.floor(Math.random() * 10000),
  quantity: number = 5
): Promise<Item[]> {
  try {
    const response = await fetch(`/api/generate-loot?seed=${seed}&quantity=${quantity}`);
    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const data = (await response.json()) as {
      loot_table: Item[];
    };

    return data.loot_table;
  } catch (error) {
    console.error("Failed to generate loot from server:", error);
    return [];
  }
}

/**
 * Get rarity color for UI display
 */
export function getRarityColor(rarity: Rarity): string {
  const colors: Record<Rarity, string> = {
    common: "#cccccc",
    uncommon: "#00cc00",
    rare: "#0066ff",
    epic: "#ff00ff",
  };
  return colors[rarity] || "#cccccc";
}
