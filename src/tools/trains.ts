import { getClient } from "../client";
import { handleToolError } from "../errors";
import { summarizeTrainRoute } from "../formatters/trains";
import type { ToolResponse } from "../types";
import { formatDateYMD, parseDateTime } from "../utils";

export async function getTrainRoute(
  brand: string,
  trainNumber: string,
  date?: string,
  closest = false,
): Promise<ToolResponse> {
  try {
    const client = await getClient();
    const dt = parseDateTime(date);
    const brandUpper = brand.toUpperCase();
    const number = /^\d+$/.test(trainNumber) ? Number(trainNumber) : 0;

    const calendars = await client.getTrainCalendars(brandUpper, number);
    const trainCalendars = Array.isArray(calendars?.train_calendars)
      ? calendars.train_calendars
      : [];
    if (trainCalendars.length === 0) {
      return {
        data: null,
        summary: `No train found for ${brand} ${trainNumber}`,
        koleo_url: "",
      };
    }

    const calendar = trainCalendars[0];
    let dateString = formatDateYMD(dt);

    const dateTrainMap = (calendar?.date_train_map ?? {}) as Record<string, number | undefined>;
    if (closest || !dateTrainMap[dateString]) {
      const dates = Array.isArray(calendar?.dates)
        ? (calendar.dates as unknown[])
            .map((entry: unknown) => String(entry))
            .sort((left: string, right: string) => left.localeCompare(right))
        : [];
      const future = dates.filter((entry: string) => entry >= dateString);
      dateString = future[0] ?? dates[dates.length - 1] ?? dateString;
    }

    const trainId = dateTrainMap[dateString];
    if (!trainId) {
      return {
        data: null,
        summary: `Train ${brand} ${trainNumber} does not run on ${dateString}`,
        koleo_url: "",
      };
    }

    const detail = await client.getTrain(Number(trainId));
    return {
      data: detail,
      summary: summarizeTrainRoute(detail.train, detail.stops ?? []),
      koleo_url: `https://koleo.pl/pl/trains/${trainId}`,
    };
  } catch (error) {
    return handleToolError(error);
  }
}

export async function getTrainById(trainId: number): Promise<ToolResponse> {
  try {
    const client = await getClient();
    const detail = await client.getTrain(trainId);

    return {
      data: detail,
      summary: summarizeTrainRoute(detail.train, detail.stops ?? []),
      koleo_url: `https://koleo.pl/pl/trains/${trainId}`,
    };
  } catch (error) {
    return handleToolError(error);
  }
}

export async function getTrainCalendar(brand: string, trainNumber: string): Promise<ToolResponse> {
  try {
    const client = await getClient();
    const number = /^\d+$/.test(trainNumber) ? Number(trainNumber) : 0;

    const calendars = await client.getTrainCalendars(brand.toUpperCase(), number);
    const trainCalendars = Array.isArray(calendars?.train_calendars)
      ? calendars.train_calendars
      : [];

    if (trainCalendars.length === 0) {
      return {
        data: [],
        summary: `No calendar found for ${brand} ${trainNumber}`,
        koleo_url: "",
      };
    }

    const calendar = trainCalendars[0];
    const dates = Array.isArray(calendar?.dates)
      ? (calendar.dates as unknown[])
          .map((entry: unknown) => String(entry))
          .sort((left: string, right: string) => left.localeCompare(right))
      : [];
    const today = formatDateYMD(new Date());
    const nextDate = dates.find((entry: string) => entry >= today) ?? null;

    return {
      data: trainCalendars,
      summary: `${String(calendar?.train_name ?? "?")} (${brand} ${trainNumber}) runs on ${dates.length} day(s). Next: ${
        nextDate ?? "no future dates found"
      }.`,
      koleo_url: "",
    };
  } catch (error) {
    return handleToolError(error);
  }
}
