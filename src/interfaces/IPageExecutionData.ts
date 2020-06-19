import { IDomain } from './IDomain';
import { IDploymentProgress } from './IDploymentProgress';
export interface IPageExecutionData {
  deploymentIdentifier:string;
  createMode: boolean;
  workingFolder: string;
  parentDomain: IDomain;
  progress: IDploymentProgress;
  verb: string;
  log: string;
}