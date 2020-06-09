import express from "express";
import socketIo from "socket.io";
import { createServer, Server } from "http";
import { DeploymentEvent } from "../enums/deployment";
import { IDomain } from "../interfaces/IDomain";
import { ITotals } from "../interfaces/ITotals";
import { DeploymentMessage } from "../interfaces/IDeploymentMessage";
const cors = require("cors");

export class DeploymentServer {
  private _app: express.Application;
  private server: Server;
  private io: SocketIO.Server;
  private port: string | number;
  static socket: any;
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
      console.log("Running server on port %s", this.port);
    });
    this.io.on(DeploymentEvent.CONNECT, (socket: any) => {
      console.log("Connected client on port %s.", this.port);
      DeploymentServer.socket = socket;
      socket.on(DeploymentEvent.DISCONNECT, () => {
        console.log("Client disconnected");
      });
    });
  }
  static async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public static async startDeployment(domains: IDomain[], deploymentIdentifier: string) {
    if (!DeploymentServer.socket) {
      return;
    }
    let pageCounter = 0;
    const totals = DeploymentServer.getTotals(domains);
    await DeploymentServer.delay(2000);
    for (let domainIndex = 0; domainIndex < domains.length; domainIndex++) {
      for (let pageIndex = 0; pageIndex < domains[domainIndex].pages.length; pageIndex++) {
        let messageText = `Deploying: ${domains[domainIndex].pages[pageIndex].displayName}`;
        if (domains[domainIndex].pages[pageIndex].repeatable) {
          messageText = `Deploying: ${domains[domainIndex].pages[pageIndex].displayName}-${domains[domainIndex].pages[pageIndex].inputs[0].value}`;
        }
        DeploymentServer.socket.emit(deploymentIdentifier, {
          message: messageText,
          totalDomains: totals.totalDomains,
          currentDomain: domainIndex,
          totalPages: totals.totalPages,
          currentPage: pageCounter
        });
        pageCounter = pageCounter + 1;
        await DeploymentServer.delay(10000);

      }
    }
    const deploymentMessage: DeploymentMessage = {
      message: `Deployment Completed`,
      totalDomains: totals.totalDomains,
      currentDomain: totals.totalDomains,
      totalPages: totals.totalPages,
      currentPage: totals.totalPages,
      final: true
    };
    DeploymentServer.socket.emit(deploymentIdentifier, deploymentMessage);

  }

  private static getTotals(domains: IDomain[]): ITotals {
    const totalDomains = domains.length;
    let totalPages = 0;
    domains.forEach(domain => {
      domain.pages.forEach(page => {
        totalPages++;
      });
    });

    return { totalDomains: totalDomains, totalPages: totalPages };
  }

  get app(): express.Application {
    return this._app;
  }
}
