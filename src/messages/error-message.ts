import { DeploymentMessage } from "./deployment-message";
import { IDeploymentPage } from "../interfaces/server/IDeploymentPage";
import { LogLine } from "../deployment/logline-message";

export class ErrordMessage extends DeploymentMessage {
  constructor(deploymentPage: IDeploymentPage, excpetionMessage?: any) {
    super(deploymentPage);
    this.final = deploymentPage.executionData.final || false;
    this.error = true;
    if (this.final) {
      this.logs.push(new LogLine("Deployment Failed"));
    }
    if (excpetionMessage) {
      this.logs.push(new LogLine(`excpetion: ${excpetionMessage.message} stack: ${excpetionMessage.stack}`));
    }
  }
}
