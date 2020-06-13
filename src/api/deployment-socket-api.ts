import { IDomain } from "./../interfaces/IDomain";
import express from "express";
import { createServer, Server } from "http";
import socketIo from "socket.io";
import { DeploymentEvent } from "../enums/deployment";
import { IDeploymentMessage } from "../interfaces/IDeploymentMessage";
import { IDploymentProgress } from "../interfaces/ITotals";
import { Logger } from "../logger/logger";
import { IPage } from "./../interfaces/IPage";
import { spawn } from "child_process";
import { Retryable, BackOffPolicy } from 'typescript-retry-decorator';
const cors = require("cors");

export class DeploymentServer {
  private _app: express.Application;
  private server: Server;
  private io: SocketIO.Server;
  private port: string | number;
  public static socket: any;
  constructor() {
    this._app = express();
    this.port = process.env.SOCKET_PORT || 9090;
    this._app.use(cors());
    this._app.options("*", cors());
    this.server = createServer(this._app);
    this.io = socketIo(this.server);
    this.listen();
  }

  private listen(): void {
    this.server.listen(this.port, () => {
      Logger.info(`Running server on port ${this.port}`);
    });
    this.io.on(DeploymentEvent.CONNECT, (socket: any) => {
      Logger.info(`Connected client on port: ${this.port}`);
      DeploymentServer.socket = socket;
      socket.on(DeploymentEvent.DISCONNECT, () => {
        Logger.info("Client disconnected");
      });
    });
  }
  static async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  @Retryable({
    maxAttempts: 3,
    backOff: 1000,
    doRetry: (e: Error) => {
      return e.message === `Error: 500; Unable to open socket: ${e.message}`;
    }
  })
  public static async startDeployment(domains: IDomain[], deploymentIdentifier: string) {
    if (!DeploymentServer.socket) {
      throw ("Not ready");
    }
    const totals = DeploymentServer.getTotals(domains);
    for (let domainIndex = 0; domainIndex < domains.length; domainIndex++) {
      for (let pageIndex = 0; pageIndex < domains[domainIndex].pages.length; pageIndex++) {
        const page = domains[domainIndex].pages[pageIndex];
        try {
          totals.curentPage = totals.curentPage + 1;
          const exitCode = await DeploymentServer.executeScript(page, deploymentIdentifier, totals, domains[domainIndex]);
          const deploymentMessage: IDeploymentMessage = {
            message: `Deploying: ${page.displayName} - Completed`,
            progress: totals,
            pageNmae: page.name,
            domainName: domains[domainIndex].name
          };
          if (exitCode) {
            deploymentMessage.error = true;
            deploymentMessage.message = `Deploying: ${page.displayName} - Failed`;
            deploymentMessage.final;
            DeploymentServer.socket.emit(deploymentIdentifier, deploymentMessage);
            // return;
          }
          DeploymentServer.socket.emit(deploymentIdentifier, deploymentMessage);
        } catch (error) {
          Logger.error(error.message, error.stack);
          const deploymentMessage: IDeploymentMessage = {
            message: `Deployment Failed, ${error.message}`,
            final: true,
            pageNmae: page.name,
            domainName: domains[domainIndex].name
          };
          DeploymentServer.socket.emit(deploymentIdentifier, deploymentMessage);
          return;
        }
      }
    }
  }

  private static getTotals(domains: IDomain[]): IDploymentProgress {
    const totalDomains = domains.length;
    let totalPages = 0;
    domains.forEach(domain => {
      domain.pages.forEach(() => {
        totalPages++;
      });
    });

    return { totalDomains: totalDomains, totalPages: totalPages, curentPage: 0 };
  }

  get app(): express.Application {
    return this._app;
  }

  private static async backupWorkingFolder(pageName: string): Promise<string> {
    const path = require("path");
    const timeStamp = new Date().getMilliseconds();
    const newFolder = path.join(process.env.COMPONENTS_ROOT, `${pageName}_${timeStamp}`);
    // const createFile = path.join(newFolder, "create.sh");
    const fs = require("fs-extra");
    try {
      await fs.copy(path.join(process.env.COMPONENTS_ROOT, pageName), newFolder);
      // await fs.ensureFile(createFile);
      return newFolder;
    } catch (err) {
      Logger.error(err.message, err.stack);
      return "";
      // throw (new Error(err.message));
    }
  }

  private static replaceUserParameters(workingFolder: string, pageToExecute: IPage) {

  }

  private static async deleteFolder(workingFolder: string) {
    const fs = require("fs-extra");
    await fs.remove(workingFolder);
  }


  private static async executeScript(pageToExecute: IPage, deploymentIdentifier: string, totals: IDploymentProgress, domain: IDomain) {
    try {
      const workingFolder = await this.backupWorkingFolder(pageToExecute.name);
      const env = Object.create(process.env);
      this.replaceUserParameters(workingFolder, pageToExecute);

      const deploymentProcess = spawn("sh", [`${workingFolder}/create.sh`], { env: env });
      const deploymentMessage: IDeploymentMessage = {
        message: `Deploying: ${pageToExecute.displayName}`,
        progress: totals,
        pageNmae: pageToExecute.name,
        domainName: domain.name
      };
      deploymentProcess.stdout.setEncoding("utf-8");
      deploymentProcess.stdout.on("data", function (log) {
        deploymentMessage.log = log;
        DeploymentServer.socket.emit(deploymentIdentifier, deploymentMessage);
      });
      deploymentProcess.stderr.setEncoding("utf-8");
      deploymentProcess.stderr.on("data", function (log) {
        deploymentMessage.log = log;
        deploymentMessage.error = true;
        DeploymentServer.socket.emit(deploymentIdentifier, deploymentMessage);
      });
      const exitCode = await new Promise((resolve, reject) => {
        deploymentProcess.on("close", resolve);
      }).catch((error) => {
        Logger.error(error.message, error.stack);
      });
      await this.deleteFolder(workingFolder);
      return exitCode;
    }
    catch (error) {
      Logger.error(error.message, error.stack);
    }

  }
}
