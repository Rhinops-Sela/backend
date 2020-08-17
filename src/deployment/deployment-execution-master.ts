import { IDeploymentPage } from "../interfaces/server/IDeploymentPage";
import { IExecuter } from "../interfaces/server/IExecuter";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import app from "../app";
import { IGlobalVariable } from "../interfaces/server/IGlobalVariable";
import { ErrordMessage } from "../messages/error-message";
import { Logger } from "../logger/logger";
import { DeploymentMessage } from "../messages/deployment-message";
import { IDeploymentProcess } from "../interfaces/server/IDeploymentProcess";
import { LogLine } from "./logline-message";
import { ErrorLogLine } from "./logline-error";
export class DeploymentExecutionMaster {
  public static deploymentProcesses: IDeploymentProcess[] = [];
  public static killedDeployments: string[] = []
  public exitCode = 0;
  private globalVariables: IGlobalVariable[] = [];
  constructor(globalVariables: IGlobalVariable[]) {
    this.globalVariables = globalVariables;
  }

  public async startListening(
    pageToExecute: IDeploymentPage,
    executer: IExecuter
  ): Promise<ChildProcessWithoutNullStreams> {
    let env = Object.create(process.env);
    env = this.addGlobalVariabels(env);
    env = this.addPageVariables(pageToExecute, env);
    // await this.replaceUGlobalParameters(pageToExecute.executionData.workingFolder);

    const args = executer.addional_args || "";

    const deploymentProcess = spawn(
      executer.executer,
      [args, `${pageToExecute.executionData.workingFolder}/${executer.file}`],
      {
        env: env,
        cwd: pageToExecute.executionData.workingFolder,
      }
    );
    DeploymentExecutionMaster.deploymentProcesses.push({
      identifier: pageToExecute.executionData.deploymentIdentifier,
      process: deploymentProcess,
    });
    deploymentProcess.stdout.setEncoding("utf-8");
    deploymentProcess.stderr.setEncoding("utf-8");
    const that = this;
    deploymentProcess.stdout.on("data", function (log) {
      if (log.trim()) {
        pageToExecute.executionData.logs.push(new LogLine(log));
      }
      app.socketServer.sendMessage(
        pageToExecute.executionData.deploymentIdentifier,
        new DeploymentMessage(pageToExecute)
      );
    });

    deploymentProcess.stderr.on("data", function (log) {
      if (log.trim()) {
        pageToExecute.executionData.logs.push(new ErrorLogLine(log));
      }
      app.socketServer.sendMessage(
        pageToExecute.executionData.deploymentIdentifier,
        new ErrordMessage(pageToExecute)
      );
      if (pageToExecute.page.stderrFail) {
        that.exitCode = -1;
        DeploymentExecutionMaster.killProcess(
          pageToExecute.executionData.deploymentIdentifier
        );
      }
    });

    return deploymentProcess;
  }

  private addGlobalVariabels(env: any): NodeJS.ProcessEnv {
    for (let globalVariable of this.globalVariables) {
      const cleanName = globalVariable.variableName.substring(
        2,
        globalVariable.variableName.length - 1
      );
      env[globalVariable.variableName] = globalVariable.variableValue;
    }
    env["API_USER"] = true;
    return env;
  }

  public static killProcess(deploymentProcessIdentifier: string) {
    const newDeploymentProcesses: IDeploymentProcess[] = [];
    var kill = require("tree-kill");
    for (let deploymentProcess of DeploymentExecutionMaster.deploymentProcesses) {
      if (deploymentProcess.identifier === deploymentProcessIdentifier) {
        DeploymentExecutionMaster.killedDeployments.push(deploymentProcessIdentifier)
        kill(deploymentProcess.process.pid);
      } else {
        newDeploymentProcesses.push(deploymentProcess);
      }
    }
    DeploymentExecutionMaster.deploymentProcesses = newDeploymentProcesses;
  }

  private addPageVariables(pageToExecute: IDeploymentPage, env: any) {
    for (const input of pageToExecute.page.inputs) {
      Logger.info(input);
      env[input.serverValue] = input.value;
    }
    return env;
  }
}
