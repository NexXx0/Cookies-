export type WeightUnit = "g" | "kg" | "ml" | "l";

export function normalizeUnit(value: unknown): WeightUnit {
  const unit = String(value ?? "").toLowerCase().trim();
  if (unit === "kg" || unit === "g" || unit === "ml" || unit === "l") return unit;
  if (unit === "lt" || unit === "l.") return "l";
  return "g";
}

export function amountToGrams(amount: number, unit: WeightUnit): number {
  if (unit === "kg") return amount * 1000;
  if (unit === "l") return amount * 1000;
  return amount;
}

export function gramsToAmount(grams: number, unit: WeightUnit): number {
  if (unit === "kg") return grams / 1000;
  if (unit === "l") return grams / 1000;
  return grams;
}

export function ingredientCostPerGram(price: number, amount: number, unit: WeightUnit): number {
  const grams = amountToGrams(amount, unit);
  return grams > 0 ? price / grams : 0;
}
