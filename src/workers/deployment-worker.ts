import { IGlobalVariable } from "./../interfaces/IGlobalVariable";
import { IDeploymentPage } from "./../interfaces/IDeploymentPage";
import { IDomain } from "../interfaces/IDomain";
import { IPage } from "../interfaces/IPage";
import { spawn } from "child_process";
import { IDploymentProgress } from "../interfaces/ITotals";
import { IDeploymentMessage } from "../interfaces/IDeploymentMessage";
import { Logger } from "../logger/logger";
import app from "../app";
import pathJoin from "path";
import { IExecuter } from "../interfaces/IExecuter";
export class DeploymentExecuter {
  static killRequested: boolean;
  private globalVariables: IGlobalVariable[] = [];
  constructor(public domains: IDomain[], public deploymentIdentifier: string) {}
  public async startDeletion(workingFolders: string[]) {
    const deployPages = this.flattenDomains("Deleting", "delete", workingFolders);
    return await this.startExecution(deployPages);
  }
  public async startDeployment(workingFolders: string[]) {
    const deployPages = this.flattenDomains("Deplopyment", "create", workingFolders);
    return await this.startExecution(deployPages);
  }

  private flattenDomains(verb: string, deployMessage: string, workingFolders: string[]): IDeploymentPage[] {
    const deployPages: IDeploymentPage[] = [];
    let currentPageCounting = 0;
    for (let domain of this.domains) {
      for (let page of domain.pages) {
        const deploymentPage = {
          page,
          executionData: {
            createMode: false,
            workingFolder: workingFolders[currentPageCounting],
            parentDomain: domain,
            progress: { currentPage: currentPageCounting + 1, totalDomains: this.domains.length },
            verb: verb,
            deployMessage: deployMessage,
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
        const deploymentMessage: IDeploymentMessage = {
          message: `${deployPage.executionData.verb} Failed, ${error.message}`,
          final: true,
          pageName: deployPage.page.name,
          domainName: deployPage.executionData.parentDomain.displayName,
        };
        app.socketServer.sendMessage(this.deploymentIdentifier, deploymentMessage);
        return;
      }
    }
  }

  private sendFinalMessage(exitCode: any, deployPage: IDeploymentPage) {
    const deploymentMessage: IDeploymentMessage = {
      message: `${deployPage.executionData.verb}: ${deployPage.page.displayName}`,
      progress: deployPage.executionData.progress,
      pageName: deployPage.page.name,
      domainName: deployPage.executionData.parentDomain.displayName,
    };
    if (exitCode || exitCode === 0) {
      if (exitCode === 0) {
        deploymentMessage.error = false;
      } else {
        deploymentMessage.error = true;
        deploymentMessage.message += "- Failed";
      }
      deploymentMessage.final = true;
      app.socketServer.sendMessage(this.deploymentIdentifier, deploymentMessage);
    } else {
      app.socketServer.sendMessage(this.deploymentIdentifier, deploymentMessage);
    }
  }

  private async getFiles(path = "./"): Promise<any> {
    try {
      const { promises: fs } = require("fs");
      const entries = await fs.readdir(path, { withFileTypes: true });

      // Get files within the current directory and add a path key to the file objects
      const files = entries
        .filter((file: { isDirectory: () => any }) => !file.isDirectory())
        .map((file: { name: string }) => ({ ...file, path: path + "/" + file.name }));

      // Get folders within the current directory
      const folders = entries.filter((folder: { isDirectory: () => any }) => folder.isDirectory());

      for (const folder of folders) {
        /*
          Add the found files within the subdirectory to the files array by calling the
          current function itself
        */
        const newPath = pathJoin.join(path, folder.name);
        files.push(...(await this.getFiles(newPath)));
      }
      return files;
    } catch (error) {
      Logger.error(error.message, error.stack);
    }
  }

  private async replaceUserParameters(workingFolder: string, pageToExecute: IPage) {
    const fs = require("fs");
    const util = require("util");
    const readFile = util.promisify(fs.readFile);
    const fs_writeFile = util.promisify(fs.writeFile);
    const files = await this.getFiles(workingFolder);
    for (const file of files) {
      let content = await readFile(file.path, "utf8");
      for (const input of pageToExecute.inputs) {
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

  private getDeployemntExecuter(deploymentPage: IDeploymentPage): IExecuter {
    switch (deploymentPage.page.executer) {
      case "pwsh": {
        return {
          executer: deploymentPage.page.executer,
          file: `${deploymentPage.executionData.deployMessage}.ps1`,
        };
      }
      default: {
        return { executer: "bash", file: `${deploymentPage.executionData.deployMessage}.sh` };
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
      await this.replaceUserParameters(result.target, page);
      await this.replaceUGlobalParameters(result.target);
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

  private addGlobalVariabels(): NodeJS.ProcessEnv {
    const env = Object.create(process.env);
    for (let globalVariable of this.globalVariables) {
      const cleanName = globalVariable.variableName.substring(2, globalVariable.variableName.length - 1);
      env[cleanName] = globalVariable.variableValue;
    }
    return env;
  }

  private async executeScript(pageToExecute: IDeploymentPage) {
    try {
      const workingFolder = pageToExecute.executionData.workingFolder;

      const executer = this.getDeployemntExecuter(pageToExecute);
      const deploymentProcess = spawn(executer.executer, [`${workingFolder}/${executer.file}`], {
        env: this.addGlobalVariabels(),
        cwd: workingFolder,
      });
      const deploymentMessage: IDeploymentMessage = {
        message: `Deploying: ${pageToExecute.page.displayName}`,
        progress: pageToExecute.executionData.progress,
        pageName: pageToExecute.page.name,
        domainName: pageToExecute.executionData.parentDomain.name,
      };
      deploymentProcess.stdout.setEncoding("utf-8");
      deploymentProcess.stdout.on("data", function (log) {
        deploymentMessage.log = log;
        if (DeploymentExecuter.killRequested) {
          Logger.info("kill requested");
          DeploymentExecuter.killRequested = false;
          deploymentProcess.kill();
          return -1;
        }
        app.socketServer.sendMessage(pageToExecute.executionData.deploymentIdentifier, deploymentMessage);
      });
      deploymentProcess.stderr.setEncoding("utf-8");
      deploymentProcess.stderr.on("data", function (log) {
        deploymentMessage.log = log;
        deploymentMessage.error = true;
        app.socketServer.sendMessage(pageToExecute.executionData.deploymentIdentifier, deploymentMessage);
        deploymentProcess.kill();
      });
      const exitCode = await new Promise((resolve, reject) => {
        deploymentProcess.on("close", resolve);
      }).catch((error) => {
        Logger.error(error.message, error.stack);
      });
      await this.deleteFolder(workingFolder);
      return exitCode;
    } catch (error) {
      Logger.error(error.message, error.stack);
    }
  }

  private getTotals(domains: IDomain[]): IDploymentProgress {
    const totalDomains = domains.length;
    let totalPages = 0;
    domains.forEach((domain) => {
      domain.pages.forEach(() => {
        totalPages++;
      });
    });

    return { totalDomains: totalDomains, totalPages: totalPages, currentPage: 0 };
  }

  private async deleteFolder(workingFolder: string) {
    const fs = require("fs-extra");
    await fs.remove(workingFolder);
  }
}
