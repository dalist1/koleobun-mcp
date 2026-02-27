function formatTime(value: unknown): string {
  if (!value) {
    return "     ";
  }

  if (typeof value === "object" && value !== null) {
    const hour = Number((value as Record<string, unknown>).hour ?? 0);
    const minute = Number((value as Record<string, unknown>).minute ?? 0);
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  if (typeof value === "string") {
    return value.slice(11, 16);
  }

  return "     ";
}

export function formatStop(stop: Record<string, any>): string {
  const arrival = formatTime(stop?.arrival);
  const departure = formatTime(stop?.departure);
  const name = String(stop?.station_display_name ?? stop?.station_name ?? "?");
  const platform = String(stop?.platform ?? "");
  const distanceKm = Number(stop?.distance ?? 0) / 1000;
  const position = platform ? ` pl.${platform}` : "";

  return `${distanceKm.toFixed(1).padStart(6, " ")}km  ${arrival} / ${departure}  ${name}${position}`;
}

export function summarizeTrainRoute(
  train: Record<string, any>,
  stops: Array<Record<string, any>>,
): string {
  const lines = [
    `${String(train?.train_full_name ?? "?")}`,
    `  Runs: ${String(train?.run_desc ?? "N/A")}`,
    `  ${stops.length} stops:`,
  ];

  const firstDistance = Number(stops[0]?.distance ?? 0);
  for (const stop of stops) {
    const adjusted = {
      ...stop,
      distance: Number(stop?.distance ?? 0) - firstDistance,
    };
    lines.push(`  ${formatStop(adjusted)}`);
  }

  return lines.join("\n");
}
