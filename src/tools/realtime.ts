import { getClient } from "../client";
import { loadConfig } from "../config";
import { handleToolError } from "../errors";
import type { ToolResponse } from "../types";
import { formatDateYMD, parseDateTime } from "../utils";

export async function getRealtimeTimetable(
  trainId: number,
  operatingDay?: string,
): Promise<ToolResponse> {
  const config = await loadConfig();
  if (!config.email || !config.password) {
    return {
      data: null,
      summary:
        'This tool requires authentication. Create ~/.config/koleo-mcp/config.json with:\n  {"email": "your@email.com", "password": "yourpassword"}',
      error: "auth_required",
      koleo_url: "",
    };
  }

  try {
    const client = await getClient();
    const day = parseDateTime(operatingDay);

    const timetable = await client.realtimeTrainTimetable(trainId, day);
    const stops = Array.isArray(timetable?.stops) ? timetable.stops : [];

    const formatTime = (value?: string): string => {
      if (!value) {
        return "     ";
      }
      return value.slice(11, 16);
    };

    const summaryLines = stops.slice(0, 15).map((stop: Record<string, any>) => {
      const actual = formatTime(stop?.actual_departure ?? stop?.actual_arrival);
      const aimed = formatTime(stop?.aimed_departure ?? stop?.aimed_arrival ?? stop?.departure);
      const delayed = actual && aimed && actual !== aimed ? " (DELAYED)" : "";
      return `  ${aimed} -> ${actual}  station_id=${stop.station_id}${delayed}`;
    });

    if (stops.length > 15) {
      summaryLines.push(`  ... and ${stops.length - 15} more stops`);
    }

    return {
      data: timetable,
      summary: `Realtime timetable: ${String(timetable?.train_full_name ?? trainId)} on ${formatDateYMD(day)}\n${summaryLines.join("\n")}`,
      koleo_url: "",
    };
  } catch (error) {
    return handleToolError(error);
  }
}
