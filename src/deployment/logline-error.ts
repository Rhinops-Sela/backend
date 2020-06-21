import { LogLine } from "./logline-message";
export class ErrorLogLine extends LogLine {
  color: string;
  constructor(content: string) {
    super(content)
    this.color = "red";
  }
}
