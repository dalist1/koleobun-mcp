import { loadConfig, type KoleoConfig } from "./config";
import { KoleoApiError } from "./errors";
import { formatDateYMD } from "./utils";

type HttpMethod = "GET" | "POST" | "PUT";

type QueryValue = string | number | boolean;

type RequestOptions = {
  params?: Record<string, QueryValue | QueryValue[] | undefined>;
  headers?: HeadersInit;
  body?: unknown;
  useAuth?: boolean;
};

function isAbsoluteUrl(pathOrUrl: string): boolean {
  return pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://");
}

function buildQueryString(params?: RequestOptions["params"]): string {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        search.append(key, String(item));
      }
      continue;
    }

    search.append(key, String(value));
  }

  return search.toString();
}

export class KoleoClient {
  private readonly baseUrl = "https://api.koleo.pl";

  private readonly baseHeaders: Record<string, string> = {
    "x-koleo-version": "2",
    "x-koleo-client": "Nuxt-1",
    "user-agent": "koleobun-mcp",
  };

  private readonly config: KoleoConfig;

  constructor(config: KoleoConfig) {
    this.config = config;
  }

  private get cookieHeader(): string | undefined {
    const auth = this.config.auth;
    if (!auth || typeof auth !== "object") {
      return undefined;
    }

    const entries = Object.entries(auth).filter(
      ([, value]) => typeof value === "string" && value.length > 0,
    );
    if (entries.length === 0) {
      return undefined;
    }

    return entries.map(([key, value]) => `${key}=${value}`).join("; ");
  }

  private async request<T>(
    method: HttpMethod,
    pathOrUrl: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const headers = new Headers(this.baseHeaders);

    for (const [key, value] of new Headers(options.headers ?? {})) {
      headers.set(key, value);
    }

    if (options.useAuth) {
      const cookie = this.cookieHeader;
      if (cookie) {
        headers.set("cookie", cookie);
      }
    }

    return this.rawRequest<T>(method, pathOrUrl, {
      ...options,
      headers,
    });
  }

  private async rawRequest<T>(
    method: HttpMethod,
    pathOrUrl: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const queryString = buildQueryString(options.params);
    const baseUrl = isAbsoluteUrl(pathOrUrl) ? pathOrUrl : `${this.baseUrl}${pathOrUrl}`;
    const separator = baseUrl.includes("?") ? "&" : "?";
    const url = queryString ? `${baseUrl}${separator}${queryString}` : baseUrl;

    const headers = new Headers(options.headers ?? {});
    let body: BodyInit | undefined;

    if (options.body !== undefined) {
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
      body = JSON.stringify(options.body);
    }

    const response = await fetch(url, {
      method,
      headers,
      body,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new KoleoApiError(response.status, text || response.statusText);
    }

    if (text.length === 0) {
      throw new KoleoApiError(404, "Empty response");
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }

  async getStations(): Promise<any[]> {
    return this.request<any[]>("GET", "/v2/main/stations");
  }

  async findStation(query: string, language = "pl"): Promise<any[]> {
    const payload = await this.request<{ stations: any[] }>("GET", "https://koleo.pl/ls", {
      params: {
        q: query,
        language,
      },
    });
    return payload.stations;
  }

  async getStationBySlug(slug: string): Promise<any> {
    return this.request<any>("GET", `/v2/main/stations/by_slug/${slug}`);
  }

  async getStationInfoBySlug(slug: string): Promise<any> {
    return this.request<any>("GET", `/v2/main/station_info/${slug}`);
  }

  async getDepartures(stationId: number, date: Date): Promise<any[]> {
    return this.request<any[]>(
      "GET",
      `/v2/main/timetables/${stationId}/${formatDateYMD(date)}/departures`,
    );
  }

  async getArrivals(stationId: number, date: Date): Promise<any[]> {
    return this.request<any[]>(
      "GET",
      `/v2/main/timetables/${stationId}/${formatDateYMD(date)}/arrivals`,
    );
  }

  async getTrainCalendars(brandName: string, number: number, name?: string): Promise<any> {
    return this.request<any>("GET", "https://koleo.pl/pl/train_calendars", {
      params: {
        brand: brandName,
        nr: number,
        name: name ? name.toUpperCase() : undefined,
      },
    });
  }

  async getTrain(id: number): Promise<any> {
    return this.request<any>("GET", `https://koleo.pl/pl/trains/${id}`);
  }

  async getConnection(id: number): Promise<any> {
    return this.request<any>("GET", `/v2/main/connections/${id}`);
  }

  async getBrands(): Promise<any[]> {
    return this.request<any[]>("GET", "/v2/main/brands");
  }

  async getCarriers(): Promise<any[]> {
    return this.request<any[]>("GET", "/v2/main/carriers");
  }

  async v3ConnectionSearch(
    startStationId: number,
    endStationId: number,
    brandIds: number[],
    date: Date,
    direct = false,
  ): Promise<any[]> {
    const payload: Record<string, unknown> = {
      start_id: startStationId,
      end_id: endStationId,
      departure_after: new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 19),
      only_direct: direct,
    };

    if (brandIds.length > 0) {
      payload.allowed_brands = brandIds;
    }

    return this.request<any[]>("POST", "/v2/main/eol_connections/search", {
      body: payload,
      headers: {
        "accept-eol-response-version": "1",
      },
    });
  }

  async v3GetPrice(uuid: string): Promise<Record<string, unknown> | null> {
    try {
      return await this.request<Record<string, unknown>>(
        "GET",
        `/v2/main/eol_connections/${uuid}/price`,
      );
    } catch (error) {
      if (error instanceof KoleoApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async v3GetConnectionId(uuid: string): Promise<number> {
    const payload = await this.request<{ connection_id: number }>(
      "PUT",
      `/v2/main/eol_connections/${uuid}/connection_id`,
    );
    return payload.connection_id;
  }

  async getSeatsAvailability(
    connectionId: number,
    trainNr: number,
    placeType: number,
  ): Promise<any> {
    return this.request<any>(
      "GET",
      `/v2/main/seats_availability/${connectionId}/${trainNr}/${placeType}`,
    );
  }

  async realtimeTrainTimetable(trainId: number, operatingDay: Date): Promise<any> {
    return this.request<any>(
      "GET",
      `/v2/main/train_timetable/${trainId}/${formatDateYMD(operatingDay)}`,
      {
        useAuth: true,
      },
    );
  }
}

let client: KoleoClient | null = null;

export async function getClient(): Promise<KoleoClient> {
  if (!client) {
    client = new KoleoClient(await loadConfig());
  }
  return client;
}

export function resetClient(): void {
  client = null;
}
