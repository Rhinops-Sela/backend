import { DeploymentMessage } from "./deployment-message";
import { IDeploymentPage } from "../interfaces/IDeploymentPage";

export class ErrordMessage extends DeploymentMessage {
  constructor(deploymentPage: IDeploymentPage, excpetionMessage?: any) {
    super(deploymentPage);
    this.final = true;
    this.error = true;
    if (excpetionMessage) {
      this.log += ` - excpetion: ${excpetionMessage.message} stack: ${excpetionMessage.stack}`;
    }
  }
}
