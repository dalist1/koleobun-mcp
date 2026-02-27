import { getClient } from "../client";
import { handleToolError } from "../errors";
import type { ToolResponse } from "../types";
import { nameToSlug, parseDateTime } from "../utils";

export async function getSeatStats(
  brand: string,
  trainNumber: string,
  date?: string,
  stations?: string[],
): Promise<ToolResponse> {
  try {
    if (!stations || stations.length !== 2) {
      return {
        data: null,
        summary: "stations parameter is required: provide [start_station, end_station]",
        error: "invalid_params",
        koleo_url: "",
      };
    }

    const client = await getClient();
    const dt = parseDateTime(date);

    const [startStation, endStation, apiBrands] = await Promise.all([
      client.getStationBySlug(nameToSlug(stations[0])),
      client.getStationBySlug(nameToSlug(stations[1])),
      client.getBrands(),
    ]);

    const brandUpper = brand.toUpperCase();
    const brandObj =
      apiBrands.find((entry) => {
        const name = String(entry?.name ?? "").toUpperCase();
        const logo = String(entry?.logo_text ?? "").toUpperCase();
        return name === brandUpper || logo === brandUpper;
      }) ?? null;

    const brandIds = brandObj ? [Number(brandObj.id)] : apiBrands.map((entry) => Number(entry.id));
    const trainNumberInt = /^\d+$/.test(trainNumber) ? Number(trainNumber) : null;

    const connections = await client.v3ConnectionSearch(
      Number(startStation.id),
      Number(endStation.id),
      brandIds,
      dt,
    );

    const connection =
      connections.find((candidate) =>
        Array.isArray(candidate?.legs)
          ? candidate.legs.some(
              (leg: Record<string, any>) =>
                leg?.leg_type === "train_leg" &&
                (trainNumberInt === null || leg?.train_nr === trainNumberInt),
            )
          : false,
      ) ?? null;

    if (!connection) {
      return {
        data: null,
        summary: `Train ${brand} ${trainNumber} not found on this connection`,
        koleo_url: "",
      };
    }

    const connectionId = await client.v3GetConnectionId(String(connection.uuid));
    const detail = await client.getConnection(connectionId);
    const train = Array.isArray(detail?.trains) ? detail.trains[0] : null;
    const availability = await client.getSeatsAvailability(
      connectionId,
      Number(train?.train_nr ?? 0),
      1,
    );

    const seats = Array.isArray(availability?.seats) ? availability.seats : [];
    const total = seats.length;
    const free = seats.filter((seat: Record<string, any>) => seat?.state === "FREE").length;
    const reserved = seats.filter((seat: Record<string, any>) => seat?.state === "RESERVED").length;
    const blocked = total - free - reserved;

    return {
      data: availability,
      summary: `${brand} ${trainNumber} on ${startStation.name} -> ${endStation.name}:\n  ${free}/${total} seats free, ${reserved} reserved, ${blocked} blocked`,
      koleo_url: "",
    };
  } catch (error) {
    return handleToolError(error);
  }
}

export async function getSeatAvailability(
  connectionId: number,
  trainNr: number,
  placeType: number,
): Promise<ToolResponse> {
  try {
    const client = await getClient();
    const availability = await client.getSeatsAvailability(connectionId, trainNr, placeType);

    const seats = Array.isArray(availability?.seats) ? availability.seats : [];
    const total = seats.length;
    const free = seats.filter((seat: Record<string, any>) => seat?.state === "FREE").length;

    return {
      data: availability,
      summary: `${free}/${total} seats free for connection ${connectionId}, train ${trainNr}, type ${placeType}`,
      koleo_url: "",
    };
  } catch (error) {
    return handleToolError(error);
  }
}

export async function getBrands(): Promise<ToolResponse> {
  try {
    const client = await getClient();
    const brands = await client.getBrands();

    const lines = brands.map(
      (brand) => `  ${String(brand.logo_text ?? "").padEnd(6, " ")} (${String(brand.name ?? "")})`,
    );

    return {
      data: brands,
      summary: `Available train brands:\n${lines.join("\n")}`,
      koleo_url: "",
    };
  } catch (error) {
    return handleToolError(error);
  }
}

export async function getCarriers(): Promise<ToolResponse> {
  try {
    const client = await getClient();
    const carriers = await client.getCarriers();

    const lines = carriers.map(
      (carrier) =>
        `  ${String(carrier.short_name ?? "").padEnd(6, " ")} -- ${String(carrier.name ?? "")}`,
    );

    return {
      data: carriers,
      summary: `Train carriers:\n${lines.join("\n")}`,
      koleo_url: "",
    };
  } catch (error) {
    return handleToolError(error);
  }
}
