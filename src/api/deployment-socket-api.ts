import express from "express";
import socketIo from "socket.io";
import { createServer, Server } from "http";
import { DeploymentEvent } from "../enums/deployment";
import { IDomain } from "../interfaces/IDomain";
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

  public static async startDeployment(domains: IDomain[]) {
    if (!DeploymentServer.socket) {
      return;
    }
    for (const domain of domains) {
      await DeploymentServer.delay(2000);
      DeploymentServer.socket.emit("deploymentUpdate", `Deploying: ${domain.displayName}`);
    }

    DeploymentServer.socket.emit("deploymentUpdate", "Done!");

  }

  get app(): express.Application {
    return this._app;
  }
}
