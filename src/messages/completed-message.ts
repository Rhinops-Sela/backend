import { DeploymentMessage } from "./deployment-message";
import { IDeploymentPage } from "../interfaces/IDeploymentPage";

export class CompletedMessage extends DeploymentMessage {
  constructor(deploymentPage: IDeploymentPage) {
    super(deploymentPage);
    this.log = 'Deployment Completed';
    this.final = true;
  }
}
