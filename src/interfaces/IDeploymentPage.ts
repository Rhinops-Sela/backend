import { IPage } from "./IPage";
import { IPageExecutionData } from "./IPageExecutionData";

export interface IDeploymentPage {
  page: IPage;
  executionData: IPageExecutionData;
}