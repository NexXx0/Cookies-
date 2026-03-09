export function custoPorGrama(preco: number, quantidade: number) {
  return preco / quantidade;
}

export function custoIngrediente(gramas: number, custoGrama: number) {
  return gramas * custoGrama;
}

export function lucro(precoVenda: number, custo: number) {
  return precoVenda - custo;
}

export function margemLucro(precoVenda: number, custo: number) {
  return ((precoVenda - custo) / precoVenda) * 100;
}

type ReceitaIngrediente = {
  grams: number;
  ingredient: {
    price: number;
    quantity: number;
  };
};

export async function calcularCustoReceita(ingredientes: ReceitaIngrediente[]) {
  let custoTotal = 0;

  for (const item of ingredientes) {
    const custoGrama = item.ingredient.price / item.ingredient.quantity;
    const custo = item.grams * custoGrama;
    custoTotal += custo;
  }

  return custoTotal;
}
