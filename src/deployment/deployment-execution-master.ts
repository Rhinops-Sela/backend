import { IDeploymentPage } from "../interfaces/server/IDeploymentPage";
import { IExecuter } from "../interfaces/server/IExecuter";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import app from "../app";
import pathJoin from "path";
import { IGlobalVariable } from "../interfaces/server/IGlobalVariable";
import { ErrordMessage } from "../messages/error-message";
import { Logger } from "../logger/logger";
import { DeploymentMessage } from "../messages/deployment-message";
import { IDeploymentProcess } from "../interfaces/server/IDeploymentProcess";
import { ILogLine } from "../interfaces/common/ILogLine";
import { LogLine } from "./logline-message";
import { ErrorLogLine } from "./logline-error";
export class DeploymentExecutionMaster {
  public static deploymentProcesses: IDeploymentProcess[] = [];
  private logLines: ILogLine[] = [];
  public exitCode = 0;
  private globalVariables: IGlobalVariable[] = [];
  constructor(globalVariables: IGlobalVariable[]) {
    this.globalVariables = globalVariables;
  }

  public async startListening(
    pageToExecute: IDeploymentPage,
    executer: IExecuter
  ): Promise<ChildProcessWithoutNullStreams> {
    await this.replaceUserParameters(pageToExecute);
    await this.replaceUGlobalParameters(pageToExecute.executionData.workingFolder);
    const deploymentProcess = spawn(
      executer.executer,
      [`${pageToExecute.executionData.workingFolder}/${executer.file}`],
      {
        env: this.addGlobalVariabels(),
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
      app.socketServer.sendMessage(pageToExecute.executionData.deploymentIdentifier, new ErrordMessage(pageToExecute));
      if (pageToExecute.page.stderrFail) {
        that.exitCode = -1;
        DeploymentExecutionMaster.killProcess(pageToExecute.executionData.deploymentIdentifier);
      }
    });

    return deploymentProcess;
  }

  private addGlobalVariabels(): NodeJS.ProcessEnv {
    const env = Object.create(process.env);
    for (let globalVariable of this.globalVariables) {
      const cleanName = globalVariable.variableName.substring(2, globalVariable.variableName.length - 1);
      env[cleanName] = globalVariable.variableValue;
    }
    return env;
  }

  public static killProcess(deploymentProcessIdentifier: string) {
    Logger.info("kill requested");
    const newDeploymentProcesses: IDeploymentProcess[] = [];
    var kill = require("tree-kill");
    for (let deploymentProcess of DeploymentExecutionMaster.deploymentProcesses) {
      if (deploymentProcess.identifier === deploymentProcessIdentifier) {
        kill(deploymentProcess.process.pid);
      } else {
        newDeploymentProcesses.push(deploymentProcess);
      }
    }
    DeploymentExecutionMaster.deploymentProcesses = newDeploymentProcesses;
  }

  private async replaceUserParameters(pageToExecute: IDeploymentPage) {
    const fs = require("fs");
    const util = require("util");
    const readFile = util.promisify(fs.readFile);
    const fs_writeFile = util.promisify(fs.writeFile);
    const files = await this.getFiles(pageToExecute.executionData.workingFolder);
    for (const file of files) {
      let content = await readFile(file.path, "utf8");
      for (const input of pageToExecute.page.inputs) {
        while (content.indexOf(`${input.serverValue}`) > 0) {
          try {
            content = content.replace(`${input.serverValue}`, `${input.value}`);
          } catch (error) {
            Logger.error(error.message, error.stack);
          }
        }
        await fs_writeFile(file.path, content, "utf-8");
      }
    }
    return files;
  }

  private async replaceUGlobalParameters(workingFolder: string) {
    const fs = require("fs");
    const util = require("util");
    const readFile = util.promisify(fs.readFile);
    const fs_writeFile = util.promisify(fs.writeFile);
    const files = await this.getFiles(workingFolder);
    for (const file of files) {
      let content = await readFile(file.path, "utf8");
      for (const globalVariable of this.globalVariables) {
        try {
          content = content.replace(`${globalVariable.variableName}`, `${globalVariable.variableValue}`);
        } catch (error) {
          Logger.error(error.message, error.stack);
        }
        await fs_writeFile(file.path, content, "utf-8");
      }
    }
    return files;
  }

  private async getFiles(path = "./"): Promise<any> {
    try {
      const { promises: fs } = require("fs");
      const entries = await fs.readdir(path, { withFileTypes: true });
      const files = entries
        .filter((file: { isDirectory: () => any }) => !file.isDirectory())
        .map((file: { name: string }) => ({ ...file, path: path + "/" + file.name }));
      const folders = entries.filter((folder: { isDirectory: () => any }) => folder.isDirectory());
      for (const folder of folders) {
        const newPath = pathJoin.join(path, folder.name);
        files.push(...(await this.getFiles(newPath)));
      }
      return files;
    } catch (error) {
      Logger.error(error.message, error.stack);
    }
  }
}
