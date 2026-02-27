import { getClient } from "../client";
import { handleToolError } from "../errors";
import type { ToolResponse } from "../types";
import { looksLikeSlug, nameToSlug } from "../utils";

export async function searchStations(
  query: string,
  type?: string,
  country?: string,
): Promise<ToolResponse> {
  try {
    const client = await getClient();
    let results = await client.findStation(query);

    if (type) {
      const expected = type.toLowerCase();
      results = results.filter((station) => String(station?.type ?? "").toLowerCase() === expected);
    }

    if (country) {
      const expectedCountry = country.toLowerCase();
      const allStations = await client.getStations();
      const allowedIds = new Set(
        allStations
          .filter((station) => String(station?.country ?? "").toLowerCase() === expectedCountry)
          .map((station) => Number(station?.id)),
      );
      results = results.filter((station) => allowedIds.has(Number(station?.id)));
    }

    const summaryLines = results
      .slice(0, 15)
      .map(
        (station) =>
          `  ${station.name} (id=${station.id}, type=${String(station.type ?? "")}, slug=${String(station.name_slug ?? "")})`,
      );

    return {
      data: results,
      summary: `Found ${results.length} station(s) matching '${query}':\n${summaryLines.join("\n")}`,
      koleo_url: `https://koleo.pl/ls?q=${encodeURIComponent(query)}`,
    };
  } catch (error) {
    return handleToolError(error);
  }
}

export async function getStationInfo(station: string): Promise<ToolResponse> {
  try {
    const client = await getClient();
    const slug = looksLikeSlug(station) ? station : nameToSlug(station);

    const [resolvedStation, info] = await Promise.all([
      client.getStationBySlug(slug),
      client.getStationInfoBySlug(slug),
    ]);

    const features = Array.isArray(info?.features)
      ? info.features
          .filter((feature: Record<string, any>) => feature?.available)
          .map((feature: Record<string, any>) => feature?.name)
      : [];

    const address = String(info?.address?.full ?? "N/A");
    const openingHours = Array.isArray(info?.opening_hours) ? info.opening_hours : [];
    const openingHoursSummary =
      openingHours.length > 0
        ? openingHours
            .slice(0, 3)
            .map((hour: Record<string, any>) => `day${hour.day}: ${hour.open}-${hour.close}`)
            .join(", ")
        : "N/A";

    const summary = [
      `${resolvedStation.name} (id=${resolvedStation.id}, slug=${resolvedStation.name_slug})`,
      `  Address: ${address}`,
      `  Opening hours: ${openingHoursSummary}`,
      `  Features: ${features.length > 0 ? features.join(", ") : "none listed"}`,
    ].join("\n");

    return {
      data: {
        station: resolvedStation,
        info,
      },
      summary,
      koleo_url: `https://koleo.pl/dworzec-pkp/${slug}`,
    };
  } catch (error) {
    return handleToolError(error);
  }
}
