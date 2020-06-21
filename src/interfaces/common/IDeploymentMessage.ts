import { ILogLine } from './ILogLine';
import { IDploymentProgress } from "./IDploymentProgress";
export interface IDeploymentMessage {
  logs: ILogLine[];
  progress: IDploymentProgress;
  final: boolean;
  error: boolean;
  domainName: string;
  pageName: string;
}
