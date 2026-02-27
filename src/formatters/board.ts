export function formatTrainOnStation(
  train: Record<string, any>,
  type: "departure" | "arrival" = "departure",
): string {
  const timeKey = type === "departure" ? "departure" : "arrival";
  const timeValue = String(train?.[timeKey] ?? "");
  const time = timeValue ? timeValue.slice(0, 16) : "??:??";
  const name = String(train?.train_full_name ?? "");
  const firstStation =
    Array.isArray(train?.stations) && train.stations.length > 0
      ? String(train.stations[0]?.name ?? "")
      : "";
  const platform = String(train?.platform ?? "");
  const track = String(train?.track ?? "");

  let pos = "";
  if (platform) {
    pos += ` pl.${platform}`;
  }
  if (track) {
    pos += `/${track}`;
  }

  return `${time}  ${name}  (${firstStation})${pos}`;
}

export function summarizeBoard(
  trains: Array<Record<string, any>>,
  stationName: string,
  dateString: string,
  type: "departure" | "arrival",
): string {
  const label = type === "departure" ? "Departures" : "Arrivals";
  const lines = [`${stationName} -- ${label} on ${dateString}:`];

  for (const train of trains.slice(0, 20)) {
    lines.push(formatTrainOnStation(train, type));
  }

  if (trains.length > 20) {
    lines.push(`  ... and ${trains.length - 20} more`);
  }

  if (trains.length === 0) {
    lines.push("  No trains found for this time.");
  }

  return lines.join("\n");
}
