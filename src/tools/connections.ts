import { getClient } from "../client";
import { handleToolError } from "../errors";
import { summarizeConnections } from "../formatters/connections";
import type { ToolResponse } from "../types";
import {
  formatDateDMYHM,
  koleoTimeToDate,
  looksLikeSlug,
  nameToSlug,
  parseDateTime,
} from "../utils";

export async function searchConnections(
  start: string,
  end: string,
  date?: string,
  brands?: string[],
  direct = false,
  includePrices = false,
  length = 5,
): Promise<ToolResponse> {
  try {
    const client = await getClient();
    const dt = parseDateTime(date);

    const startSlug = looksLikeSlug(start) ? start : nameToSlug(start);
    const endSlug = looksLikeSlug(end) ? end : nameToSlug(end);

    const [startStation, endStation, apiBrands] = await Promise.all([
      client.getStationBySlug(startSlug),
      client.getStationBySlug(endSlug),
      client.getBrands(),
    ]);

    const requested = (brands ?? []).map((brand) => brand.toLowerCase());
    const brandIds =
      requested.length > 0
        ? apiBrands
            .filter((brand) => {
              const name = String(brand?.name ?? "").toLowerCase();
              const code = String(brand?.logo_text ?? "").toLowerCase();
              return requested.includes(name) || requested.includes(code);
            })
            .map((brand) => Number(brand?.id))
        : apiBrands.map((brand) => Number(brand?.id));

    const results: Array<Record<string, any>> = [];
    let fetchDate = dt;
    let iterations = 0;

    while (results.length < length && iterations < 10) {
      const chunk = await client.v3ConnectionSearch(
        Number(startStation.id),
        Number(endStation.id),
        brandIds,
        fetchDate,
        direct,
      );

      if (chunk.length === 0) {
        break;
      }

      results.push(...chunk);
      const lastDeparture = chunk[chunk.length - 1]?.departure;
      fetchDate = new Date(koleoTimeToDate(String(lastDeparture)).getTime() + 1_801_000);
      iterations += 1;
    }

    const limited = results.slice(0, length);

    let prices: Record<string, Record<string, any> | null> = {};
    if (includePrices && limited.length > 0) {
      const priceResults = await Promise.all(
        limited.map((connection) => client.v3GetPrice(String(connection.uuid))),
      );
      prices = Object.fromEntries(
        limited.map((connection, index) => [String(connection.uuid), priceResults[index]]),
      );
    }

    return {
      data: limited.map((connection) => ({
        connection,
        price: prices[String(connection.uuid)] ?? null,
      })),
      summary: summarizeConnections(
        limited,
        String(startStation.name),
        String(endStation.name),
        prices,
      ),
      koleo_url: `https://koleo.pl/rozklad-pkp/${startSlug}/${endSlug}/${formatDateDMYHM(dt)}/${
        direct ? "direct" : "all"
      }/all`,
    };
  } catch (error) {
    return handleToolError(error);
  }
}
