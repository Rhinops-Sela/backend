import { ChildProcessWithoutNullStreams } from "child_process";
import { CompletedMessage } from "./../messages/completed-message";
import { ErrordMessage } from "../messages/error-message";
import { IGlobalVariable } from "../interfaces/server/IGlobalVariable";
import { IDeploymentPage } from "../interfaces/server/IDeploymentPage";
import { IDomain } from "../interfaces/common/IDomain";
import { IPage } from "../interfaces/common/IPage";
import { Logger } from "../logger/logger";
import app from "../app";
import { IExecuter } from "../interfaces/server/IExecuter";
import { DeploymentExecutionMaster } from "./deployment-execution-master";
import { IDeploymentProcess } from "../interfaces/server/IDeploymentProcess";
import { LogLine } from "./logline-message";
export class DeploymentExecuter {
  private globalVariables: IGlobalVariable[] = [];

  constructor(public domains: IDomain[], public deploymentIdentifier: string) {}
  public async startDeletion(workingFolders: string[]) {
    const deployPages = this.flattenDomains("Deleting", "delete", workingFolders);
    return await this.startExecution(deployPages);
  }
  public async startDeployment(workingFolders: string[]) {
    const deployPages = this.flattenDomains("Starting Deployment", "create", workingFolders);
    return await this.startExecution(deployPages);
  }

  private flattenDomains(deployMessage: string, verb: string, workingFolders: string[]): IDeploymentPage[] {
    const deployPages: IDeploymentPage[] = [];
    let currentPageCounting = 0;
    for (let domain of this.domains) {
      for (let page of domain.pages) {
        for (let input of page.inputs) {
          if (!input.value) {
            if (input.defaultValue != null) {
              input.value = input.defaultValue;
            }
          }
        }
        let createMode = true;
        if (verb != "delete") {
          createMode = false;
        }
        const deploymentPage = {
          page,
          executionData: {
            createMode: createMode,
            workingFolder: workingFolders[currentPageCounting],
            parentDomain: domain,
            progress: { currentPage: currentPageCounting + 1, totalDomains: this.domains.length },
            verb: verb,
            logs: [new LogLine(deployMessage)],
            deploymentIdentifier: this.deploymentIdentifier,
          },
        };
        deployPages.push(deploymentPage);
        currentPageCounting++;
        for (let input of page.inputs) {
          if (input.global) {
            this.globalVariables.push({ variableName: input.serverValue, variableValue: input.value });
          }
        }
      }
    }
    return deployPages;
  }

  public async createWorkingFolders() {
    const workingFolders: string[] = [];
    for (let domainIndex = 0; domainIndex < this.domains.length; domainIndex++) {
      for (let pageIndex = 0; pageIndex < this.domains[domainIndex].pages.length; pageIndex++) {
        const page = this.domains[domainIndex].pages[pageIndex];
        workingFolders.push(await this.backupWorkingFolder(page));
      }
    }
    Logger.info(`Workingfolder: ${workingFolders}`);
    await this.copyCommonFolder();
    return workingFolders;
  }

  private async startExecution(deployPages: IDeploymentPage[]) {
    for (let deployPage of deployPages) {
      try {
        deployPage.executionData.progress.totalPages = deployPages.length;
        const exitCode = await this.executeScript(deployPage);
        this.sendFinalMessage(exitCode, deployPage);
      } catch (error) {
        Logger.error(error.message, error.stack);
        const deploymentMessage = new ErrordMessage(deployPage, error);
        app.socketServer.sendMessage(this.deploymentIdentifier, deploymentMessage);
        return;
      }
    }
  }

  private sendFinalMessage(exitCode: any, deployPage: IDeploymentPage) {
    let deploymentMessage;
    deployPage.executionData.final = true;
    if (exitCode === 0) {
      deploymentMessage = new CompletedMessage(deployPage);
    } else {
      deploymentMessage = new ErrordMessage(deployPage);
    }
    app.socketServer.sendMessage(this.deploymentIdentifier, deploymentMessage);
  }

  private getDeployemntExecuter(deploymentPage: IDeploymentPage): IExecuter {
    switch (deploymentPage.page.executer) {
      case "pwsh": {
        return {
          executer: deploymentPage.page.executer,
          file: `${deploymentPage.executionData.verb}.ps1`,
        };
      }
      default: {
        return { executer: "bash", file: `${deploymentPage.executionData.verb}.sh` };
      }
    }
  }

  private async copyFolder(source: string[], target: string[]): Promise<{ source: string; target: string }> {
    const fs = require("fs-extra");
    const path = require("path");
    const shell = require("shelljs");
    const targetFolder = path.join.apply(null, target);
    const sourceFoldet = path.join.apply(null, source);
    shell.mkdir("-p", targetFolder);
    await fs.copy(sourceFoldet, targetFolder);
    return { source: sourceFoldet, target: targetFolder };
  }

  private async copyCommonFolder() {
    await this.copyFolder(
      [__dirname, process.env.COMPONENTS_ROOT!, "common"],
      [__dirname, process.env.WORKING_ROOT!, `common`]
    );
  }

  private async backupWorkingFolder(page: IPage): Promise<string> {
    try {
      const timeStamp = new Date().getMilliseconds();
      const result = await this.copyFolder(
        [__dirname, process.env.COMPONENTS_ROOT!, this.removedCloned(page.name)],
        [__dirname, process.env.WORKING_ROOT!, `${page.name}_${timeStamp}`]
      );
      return result.target;
    } catch (err) {
      Logger.error(err.message, err.stack);
      throw new Error(err.message);
    }
  }

  private removedCloned(pageName: string): string {
    if (pageName.indexOf("_fenneccloned") > -1) {
      const cleanedPageName = pageName.substring(0, pageName.lastIndexOf("_"));
      return cleanedPageName;
    }
    return pageName;
  }

  private async executeScript(pageToExecute: IDeploymentPage) {
    try {
      const workingFolder = pageToExecute.executionData.workingFolder;
      const executer = this.getDeployemntExecuter(pageToExecute);
      const deploymentExecutionMaster = new DeploymentExecutionMaster(this.globalVariables);
      const deploymentProcess = await deploymentExecutionMaster.startListening(pageToExecute, executer);
      await new Promise((resolve, reject) => {
        deploymentProcess.on("close", resolve);
      }).catch((error) => {
        Logger.error(error.message, error.stack);
      });
      //await this.deleteFolder(workingFolder);
      return deploymentExecutionMaster.exitCode;
    } catch (error) {
      Logger.error(error.message, error.stack);
    }
  }

  private async deleteFolder(workingFolder: string) {
    const fs = require("fs-extra");
    await fs.remove(workingFolder);
  }
}
