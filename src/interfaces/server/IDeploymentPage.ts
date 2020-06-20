import { IPage } from "../common/IPage";
import { IPageExecutionData } from "./IPageExecutionData";

export interface IDeploymentPage {
  page: IPage;
  executionData: IPageExecutionData;
}