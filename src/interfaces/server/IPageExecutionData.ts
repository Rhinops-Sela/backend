import { ILogLine } from './../common/ILogLine';
import { IDomain } from '../common/IDomain';
import { IDploymentProgress } from '../common/IDploymentProgress';
export interface IPageExecutionData {
  deploymentIdentifier:string;
  createMode: boolean;
  workingFolder: string;
  parentDomain: IDomain;
  progress: IDploymentProgress;
  verb: string;
  logs: ILogLine[];
  final?: boolean;
}