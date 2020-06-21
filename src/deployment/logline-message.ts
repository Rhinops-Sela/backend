import { ILogLine } from "../interfaces/common/ILogLine";
export class LogLine implements ILogLine {
  color: string;
  time: string;
  content: string;
  constructor(content: string) {
    this.content = content;
    this.color = "#f2f3f4";
    this.time = new Date().toLocaleString();
  }
}
