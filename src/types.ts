export interface ToolResponse {
  data: unknown;
  summary: string;
  koleo_url: string;
  error?: string;
}

export type TimeDict = {
  hour: number;
  minute: number;
  second?: number;
};
