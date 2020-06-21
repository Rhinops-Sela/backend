import { LogLine } from "./../deployment/logline-message";
import { DeploymentMessage } from "./deployment-message";
import { IDeploymentPage } from "../interfaces/server/IDeploymentPage";

export class CompletedMessage extends DeploymentMessage {
  constructor(deploymentPage: IDeploymentPage) {
    super(deploymentPage);
    if (deploymentPage.executionData.createMode) {
      this.logs.push(new LogLine("Deployment Completed"));
    } else {
      this.logs.push(new LogLine("Deletion Completed"));
    }

    this.final = true;
  }
}
