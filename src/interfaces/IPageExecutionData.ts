import { IDomain } from './IDomain';
import { IDploymentProgress } from './ITotals';
export interface IPageExecutionData {
  deploymentIdentifier:string;
  createMode: boolean;
  workingFolder: string;
  parentDomain: IDomain;
  progress: IDploymentProgress;
  verb: string;
  deployMessage: string;
}