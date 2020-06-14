import { IDploymentProgress } from "./ITotals";
export interface IDeploymentMessage {
  message: string;
  log?: any;
  progress?: IDploymentProgress;
  final?: true;
  error?: boolean;
  domainName: string;
  pageName: string;
}
