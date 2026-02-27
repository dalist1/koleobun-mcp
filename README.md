# koleobun-mcp

Bun-based MCP server for the [Koleo](https://koleo.pl) Polish train timetable API.

It exposes the same 14 tools as the Python MCP, including stations, boards, connections, train routes, seat data, and realtime timetable.

## Requirements

- Supported Bun: `1.3.x` (tested on `1.3.11`)

## Quick start

Run directly from npm with bunx:

```bash
bunx koleobun-mcp
```

If the command starts without crashing, the MCP server is ready.

## Local development

```bash
bun install
bun run start
```

## Quality checks

```bash
bun run format
bun run lint
bun run typecheck
```

## Test with MCP Inspector

```bash
bunx @modelcontextprotocol/inspector bunx koleobun-mcp
```

Then call these tools:

1. `tool_search_stations` with `query = "Krakow"`
2. `tool_get_departures` with `station = "Krakow Glowny"`
3. `tool_search_connections` with `start = "Krakow"`, `end = "Warszawa"`, `length = 3`
4. `tool_get_brands`
5. `tool_get_realtime_timetable` with any `train_id`

## Claude Desktop config

Add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "koleo": {
      "command": "bunx",
      "args": ["koleobun-mcp"]
    }
  }
}
```

## Authentication (optional, needed for realtime)

Create `~/.config/koleo-mcp/config.json`:

```json
{
  "email": "your@email.com",
  "password": "yourpassword"
}
```

You can override the config path with `KOLEO_MCP_CONFIG`.

## Available tools

| Tool                          | Description                                     |
| ----------------------------- | ----------------------------------------------- |
| `tool_search_stations`        | Search stations by name                         |
| `tool_get_station_info`       | Station address, opening hours, facilities      |
| `tool_get_departures`         | Departures from a station                       |
| `tool_get_arrivals`           | Arrivals at a station                           |
| `tool_get_all_trains`         | All trains (departures + arrivals) at a station |
| `tool_search_connections`     | Find connections A->B                           |
| `tool_get_train_route`        | Train route by brand + number                   |
| `tool_get_train_by_id`        | Train route by Koleo train ID                   |
| `tool_get_train_calendar`     | Operating dates for a train                     |
| `tool_get_realtime_timetable` | Live timetable (auth required)                  |
| `tool_get_seat_stats`         | Seat occupancy stats on a route                 |
| `tool_get_seat_availability`  | Raw seat map by connection ID                   |
| `tool_get_brands`             | List train brands                               |
| `tool_get_carriers`           | List carriers                                   |
