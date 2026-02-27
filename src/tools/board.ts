import { getClient } from "../client";
import { handleToolError } from "../errors";
import { summarizeBoard } from "../formatters/board";
import type { ToolResponse } from "../types";
import {
  formatDateYMD,
  formatDateYMDHM,
  formatLocalIsoMinute,
  looksLikeSlug,
  nameToSlug,
  parseDateTime,
} from "../utils";

async function resolveStation(station: string): Promise<Record<string, any>> {
  const client = await getClient();
  const slug = looksLikeSlug(station) ? station : nameToSlug(station);
  return client.getStationBySlug(slug);
}

export async function getDepartures(station: string, date?: string): Promise<ToolResponse> {
  try {
    const client = await getClient();
    const dt = parseDateTime(date);
    const resolvedStation = await resolveStation(station);

    const trains = await client.getDepartures(Number(resolvedStation.id), dt);
    const cutoff = formatLocalIsoMinute(dt);
    const filtered = trains.filter((train) => String(train?.departure ?? "") >= cutoff);

    return {
      data: filtered,
      summary: summarizeBoard(
        filtered,
        String(resolvedStation.name),
        formatDateYMDHM(dt),
        "departure",
      ),
      koleo_url: `https://koleo.pl/dworzec-pkp/${resolvedStation.name_slug}/odjazdy/${formatDateYMD(dt)}`,
    };
  } catch (error) {
    return handleToolError(error);
  }
}

export async function getArrivals(station: string, date?: string): Promise<ToolResponse> {
  try {
    const client = await getClient();
    const dt = parseDateTime(date);
    const resolvedStation = await resolveStation(station);

    const trains = await client.getArrivals(Number(resolvedStation.id), dt);
    const cutoff = formatLocalIsoMinute(dt);
    const filtered = trains.filter((train) => String(train?.arrival ?? "") >= cutoff);

    return {
      data: filtered,
      summary: summarizeBoard(
        filtered,
        String(resolvedStation.name),
        formatDateYMDHM(dt),
        "arrival",
      ),
      koleo_url: `https://koleo.pl/dworzec-pkp/${resolvedStation.name_slug}/przyjazdy/${formatDateYMD(dt)}`,
    };
  } catch (error) {
    return handleToolError(error);
  }
}

export async function getAllTrains(station: string, date?: string): Promise<ToolResponse> {
  try {
    const client = await getClient();
    const dt = parseDateTime(date);
    const resolvedStation = await resolveStation(station);

    const [departures, arrivals] = await Promise.all([
      client.getDepartures(Number(resolvedStation.id), dt),
      client.getArrivals(Number(resolvedStation.id), dt),
    ]);

    const cutoff = formatLocalIsoMinute(dt);
    const combined = [
      ...departures
        .filter((train) => String(train?.departure ?? "") >= cutoff)
        .map((train) => ({ train, type: "departure" as const })),
      ...arrivals
        .filter((train) => String(train?.arrival ?? "") >= cutoff)
        .map((train) => ({ train, type: "arrival" as const })),
    ].sort((a, b) =>
      String(a.train?.[a.type] ?? "").localeCompare(String(b.train?.[b.type] ?? "")),
    );

    const lines = combined.slice(0, 20).map(({ train, type }) => {
      const time = String(train?.[type] ?? "").slice(0, 16);
      const label = type === "departure" ? "DEP" : "ARR";
      const name = String(train?.train_full_name ?? "");
      const firstStation =
        Array.isArray(train?.stations) && train.stations.length > 0
          ? String(train.stations[0]?.name ?? "")
          : "";
      return `  ${label} ${time}  ${name}  (${firstStation})`;
    });

    if (combined.length > 20) {
      lines.push(`  ... and ${combined.length - 20} more`);
    }

    return {
      data: combined,
      summary: `${resolvedStation.name} -- all trains on ${formatDateYMDHM(dt)}:\n${lines.join("\n")}`,
      koleo_url: `https://koleo.pl/dworzec-pkp/${resolvedStation.name_slug}/odjazdy/${formatDateYMD(dt)}`,
    };
  } catch (error) {
    return handleToolError(error);
  }
}
