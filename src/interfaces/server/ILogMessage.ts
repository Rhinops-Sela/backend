export interface ILogMessage {
  message: {
    prefix: string;
    content: string;
    severity: number;
  };
  additionalObjects: any[];
  stack?: string;
}
