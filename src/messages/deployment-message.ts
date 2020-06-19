import { IDeploymentPage } from "../interfaces/IDeploymentPage";
import { IDeploymentMessage } from "../interfaces/IDeploymentMessage";
import { IDploymentProgress } from "../interfaces/IDploymentProgress";

export  class DeploymentMessage implements IDeploymentMessage {
  log: any;
  progress: IDploymentProgress;
  final: boolean = false;
  error: boolean = false;
  domainName: string;
  pageName: string;
  constructor(deploymentPage: IDeploymentPage) {
    this.log = deploymentPage.executionData.log;
    this.domainName = deploymentPage.executionData.parentDomain.name;
    this.pageName = deploymentPage.page.name;
    this.progress = deploymentPage.executionData.progress;
  }
}
