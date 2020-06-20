import { IDploymentProgress } from "./IDploymentProgress";
export interface IDeploymentMessage {
  log: any;
  progress: IDploymentProgress;
  final: boolean;
  error: boolean;
  domainName: string;
  pageName: string;
}
