export type WeightUnit = "g" | "kg";

export function normalizeUnit(value: unknown): WeightUnit {
  return String(value).toLowerCase() === "kg" ? "kg" : "g";
}

export function amountToGrams(amount: number, unit: WeightUnit): number {
  return unit === "kg" ? amount * 1000 : amount;
}

export function gramsToAmount(grams: number, unit: WeightUnit): number {
  return unit === "kg" ? grams / 1000 : grams;
}

export function ingredientCostPerGram(price: number, amount: number, unit: WeightUnit): number {
  const grams = amountToGrams(amount, unit);
  return grams > 0 ? price / grams : 0;
}
