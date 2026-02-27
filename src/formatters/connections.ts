export function formatConnection(
  connection: Record<string, any>,
  price?: Record<string, any> | null,
): string {
  const departure = String(connection?.departure ?? "").slice(0, 16);
  const arrival = String(connection?.arrival ?? "").slice(0, 16);
  const duration = Number(connection?.duration ?? 0);
  const changes = Number(connection?.changes ?? 0);
  const legs = Array.isArray(connection?.legs) ? connection.legs : [];

  const trainNames = legs
    .filter((leg: Record<string, any>) => leg?.leg_type === "train_leg")
    .map((leg: Record<string, any>) => String(leg?.train_full_name ?? ""))
    .filter(Boolean);

  const priceLabel = price ? `  [${price.price}]` : "";
  const changesLabel = changes > 0 ? `${changes} change(s)` : "direct";

  return `${departure} -> ${arrival}  ${duration}min  ${changesLabel}  via ${trainNames.join(", ")}${priceLabel}`;
}

export function summarizeConnections(
  connections: Array<Record<string, any>>,
  startName: string,
  endName: string,
  prices: Record<string, Record<string, any> | null>,
): string {
  const lines = [`Connections ${startName} -> ${endName}:`];

  for (const connection of connections) {
    const uuid = String(connection?.uuid ?? "");
    lines.push(`  ${formatConnection(connection, prices[uuid])}`);
  }

  if (connections.length === 0) {
    lines.push("  No connections found.");
  }

  return lines.join("\n");
}
