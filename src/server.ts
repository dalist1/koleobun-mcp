#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v4";
import type { ToolResponse } from "./types";
import { getAllTrains, getArrivals, getDepartures } from "./tools/board";
import { searchConnections } from "./tools/connections";
import { getRealtimeTimetable } from "./tools/realtime";
import { getBrands, getCarriers, getSeatAvailability, getSeatStats } from "./tools/seats";
import { getStationInfo, searchStations } from "./tools/stations";
import { getTrainById, getTrainCalendar, getTrainRoute } from "./tools/trains";

const server = new McpServer({
  name: "koleo",
  version: "0.1.0",
});

const TOOL_OUTPUT_SCHEMA = {
  data: z.unknown(),
  summary: z.string(),
  koleo_url: z.string(),
  error: z.string().optional(),
};

function formatToolText(payload: ToolResponse): string {
  if (payload.koleo_url) {
    return `${payload.summary}\nKoleo URL: ${payload.koleo_url}`;
  }
  return payload.summary;
}

function toolResult(payload: ToolResponse) {
  const response = {
    content: [
      {
        type: "text" as const,
        text: formatToolText(payload),
      },
    ],
    structuredContent: {
      data: payload.data,
      summary: payload.summary,
      koleo_url: payload.koleo_url,
      ...(payload.error ? { error: payload.error } : {}),
    },
  };

  if (payload.error) {
    return {
      ...response,
      isError: true,
    };
  }

  return response;
}

server.registerTool(
  "tool_search_stations",
  {
    description: "Search for train stations by name. Returns station IDs, slugs, and types.",
    inputSchema: {
      query: z.string(),
      type: z.string().optional(),
      country: z.string().optional(),
    },
    outputSchema: TOOL_OUTPUT_SCHEMA,
  },
  async ({ query, type, country }) => toolResult(await searchStations(query, type, country)),
);

server.registerTool(
  "tool_get_station_info",
  {
    description: "Get detailed info about a station: address, opening hours, available facilities.",
    inputSchema: {
      station: z.string(),
    },
    outputSchema: TOOL_OUTPUT_SCHEMA,
  },
  async ({ station }) => toolResult(await getStationInfo(station)),
);

server.registerTool(
  "tool_get_departures",
  {
    description: "Get upcoming train departures from a station.",
    inputSchema: {
      station: z.string(),
      date: z.string().optional(),
    },
    outputSchema: TOOL_OUTPUT_SCHEMA,
  },
  async ({ station, date }) => toolResult(await getDepartures(station, date)),
);

server.registerTool(
  "tool_get_arrivals",
  {
    description: "Get upcoming train arrivals at a station.",
    inputSchema: {
      station: z.string(),
      date: z.string().optional(),
    },
    outputSchema: TOOL_OUTPUT_SCHEMA,
  },
  async ({ station, date }) => toolResult(await getArrivals(station, date)),
);

server.registerTool(
  "tool_get_all_trains",
  {
    description: "Get all trains (both departures and arrivals) at a station, sorted by time.",
    inputSchema: {
      station: z.string(),
      date: z.string().optional(),
    },
    outputSchema: TOOL_OUTPUT_SCHEMA,
  },
  async ({ station, date }) => toolResult(await getAllTrains(station, date)),
);

server.registerTool(
  "tool_search_connections",
  {
    description: "Search for train connections between two stations.",
    inputSchema: {
      start: z.string(),
      end: z.string(),
      date: z.string().optional(),
      brands: z.array(z.string()).optional(),
      direct: z.boolean().optional(),
      include_prices: z.boolean().optional(),
      length: z.number().int().optional(),
    },
    outputSchema: TOOL_OUTPUT_SCHEMA,
  },
  async ({ start, end, date, brands, direct, include_prices, length }) =>
    toolResult(
      await searchConnections(
        start,
        end,
        date,
        brands,
        direct ?? false,
        include_prices ?? false,
        length ?? 5,
      ),
    ),
);

server.registerTool(
  "tool_get_train_route",
  {
    description: "Get the full route and stop schedule for a train by brand and number.",
    inputSchema: {
      brand: z.string(),
      train_number: z.string(),
      date: z.string().optional(),
      closest: z.boolean().optional(),
    },
    outputSchema: TOOL_OUTPUT_SCHEMA,
  },
  async ({ brand, train_number, date, closest }) =>
    toolResult(await getTrainRoute(brand, train_number, date, closest ?? false)),
);

server.registerTool(
  "tool_get_train_by_id",
  {
    description: "Get a train route and stops by internal Koleo train ID.",
    inputSchema: {
      train_id: z.number().int(),
    },
    outputSchema: TOOL_OUTPUT_SCHEMA,
  },
  async ({ train_id }) => toolResult(await getTrainById(train_id)),
);

server.registerTool(
  "tool_get_train_calendar",
  {
    description: "Get all dates when a specific train runs (operating calendar).",
    inputSchema: {
      brand: z.string(),
      train_number: z.string(),
    },
    outputSchema: TOOL_OUTPUT_SCHEMA,
  },
  async ({ brand, train_number }) => toolResult(await getTrainCalendar(brand, train_number)),
);

server.registerTool(
  "tool_get_seat_stats",
  {
    description: "Check seat occupancy statistics for a train on a given route segment.",
    inputSchema: {
      brand: z.string(),
      train_number: z.string(),
      stations: z.array(z.string()),
      date: z.string().optional(),
    },
    outputSchema: TOOL_OUTPUT_SCHEMA,
  },
  async ({ brand, train_number, stations, date }) =>
    toolResult(await getSeatStats(brand, train_number, date, stations)),
);

server.registerTool(
  "tool_get_seat_availability",
  {
    description:
      "Get raw seat availability for a connection by connection_id, train_nr, and place_type.",
    inputSchema: {
      connection_id: z.number().int(),
      train_nr: z.number().int(),
      place_type: z.number().int(),
    },
    outputSchema: TOOL_OUTPUT_SCHEMA,
  },
  async ({ connection_id, train_nr, place_type }) =>
    toolResult(await getSeatAvailability(connection_id, train_nr, place_type)),
);

server.registerTool(
  "tool_get_brands",
  {
    description: "List all available train brands/operators.",
    outputSchema: TOOL_OUTPUT_SCHEMA,
  },
  async () => toolResult(await getBrands()),
);

server.registerTool(
  "tool_get_carriers",
  {
    description: "List all train carriers.",
    outputSchema: TOOL_OUTPUT_SCHEMA,
  },
  async () => toolResult(await getCarriers()),
);

server.registerTool(
  "tool_get_realtime_timetable",
  {
    description: "Get realtime timetable for a train, including actual vs scheduled times.",
    inputSchema: {
      train_id: z.number().int(),
      operating_day: z.string().optional(),
    },
    outputSchema: TOOL_OUTPUT_SCHEMA,
  },
  async ({ train_id, operating_day }) =>
    toolResult(await getRealtimeTimetable(train_id, operating_day)),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Failed to start koleobun-mcp server:", error);
  process.exit(1);
});
