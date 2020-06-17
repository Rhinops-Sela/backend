import { IDomain } from '../interfaces/IDomain';
import { IPage } from '../interfaces/IPage';
import { spawn } from "child_process";
import { IDploymentProgress } from "../interfaces/ITotals";
import { IDeploymentMessage } from "../interfaces/IDeploymentMessage";
import { Logger } from "../logger/logger";
import app from "../app";
import pathJoin from "path";
import { IExecuter } from '../interfaces/IExecuter';
export class DeploymentExecuter {
         constructor(public domains: IDomain[], public deploymentIdentifier: string) {}
         public async startDeletion(workingFolders: string[]) {
           return await this.startExecution("Deleting", "delete", workingFolders);
         }
         public async startDeployment(workingFolders: string[]) {
           return await this.startExecution("Deplopyment", "create", workingFolders);
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
           return workingFolders;
         }

         private async startExecution(verb: string, mode: string, workingFolders: string[]) {
           const totals = this.getTotals(this.domains);
           for (let domainIndex = 0; domainIndex < this.domains.length; domainIndex++) {
             for (let pageIndex = 0; pageIndex < this.domains[domainIndex].pages.length; pageIndex++) {
               const page = this.domains[domainIndex].pages[pageIndex];
               try {
                 totals.curentPage = totals.curentPage + 1;
                 const exitCode = await this.executeScript(
                   workingFolders[totals.curentPage - 1],
                   page,
                   this.deploymentIdentifier,
                   totals,
                   this.domains[domainIndex],
                   mode
                 );
                 const deploymentMessage: IDeploymentMessage = {
                   message: `${verb}: ${page.displayName} - Completed`,
                   progress: totals,
                   pageName: page.name,
                   domainName: this.domains[domainIndex].name,
                 };
                 if (exitCode) {
                   deploymentMessage.error = true;
                   deploymentMessage.message = `${verb}: ${page.displayName} - Failed`;
                   deploymentMessage.final;
                   app.socketServer.sendMessage(this.deploymentIdentifier, deploymentMessage);
                 } else {
                   app.socketServer.sendMessage(this.deploymentIdentifier, deploymentMessage);
                 }
               } catch (error) {
                 Logger.error(error.message, error.stack);
                 const deploymentMessage: IDeploymentMessage = {
                   message: `${verb} Failed, ${error.message}`,
                   final: true,
                   pageName: page.name,
                   domainName: this.domains[domainIndex].name,
                 };
                 app.socketServer.sendMessage(this.deploymentIdentifier, deploymentMessage);
                 return;
               }
             }
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

         private getDeployemntExecuter(page: IPage, mode: string): IExecuter {
           switch (page.executer) {
             case "ps1": {
               return { executer: page.executer, file: `${mode}.ps1` };
             }
             default: {
               return { executer: "bash", file: `${mode}.sh` };
             }
           }
         }

         private async backupWorkingFolder(page: IPage): Promise<string> {
           const path = require("path");
           const timeStamp = new Date().getMilliseconds();
           const newFolder = path.join(process.env.WORKING_ROOT, `${page.name}_${timeStamp}`);
           const shell = require("shelljs");
           shell.mkdir("-p", newFolder);
           const fs = require("fs-extra");
           try {
             await fs.copy(path.join(process.env.COMPONENTS_ROOT, page.name), newFolder);
             await this.replaceUserParameters(newFolder, page);
             return newFolder;
           } catch (err) {
             Logger.error(err.message, err.stack);
             throw new Error(err.message);
           }
         }

         private async executeScript(
           workingFolder: string,
           pageToExecute: IPage,
           deploymentIdentifier: string,
           totals: IDploymentProgress,
           domain: IDomain,
           mode: string
         ) {
           try {
             const env = Object.create(process.env);
             const executer = this.getDeployemntExecuter(pageToExecute, mode);
             const deploymentProcess = spawn(executer.executer, [`${workingFolder}/${executer.file}`], { env: env });
             const deploymentMessage: IDeploymentMessage = {
               message: `Deploying: ${pageToExecute.displayName}`,
               progress: totals,
               pageName: pageToExecute.name,
               domainName: domain.name,
             };
             deploymentProcess.stdout.setEncoding("utf-8");
             deploymentProcess.stdout.on("data", function (log) {
               deploymentMessage.log = log;
               app.socketServer.sendMessage(deploymentIdentifier, deploymentMessage);
             });
             deploymentProcess.stderr.setEncoding("utf-8");
             deploymentProcess.stderr.on("data", function (log) {
               deploymentMessage.log = log;
               deploymentMessage.error = true;
               app.socketServer.sendMessage(deploymentIdentifier, deploymentMessage);
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

           return { totalDomains: totalDomains, totalPages: totalPages, curentPage: 0 };
         }

         private async deleteFolder(workingFolder: string) {
           const fs = require("fs-extra");
           await fs.remove(workingFolder);
         }
       }