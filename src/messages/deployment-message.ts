import { IDeploymentPage } from "../interfaces/server/IDeploymentPage";
import { IDeploymentMessage } from "../interfaces/common/IDeploymentMessage";
import { IDploymentProgress } from "../interfaces/common/IDploymentProgress";

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
