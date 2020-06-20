import { createServer, Server } from "http";
import socketIo from "socket.io";
import { DeploymentEvent } from "../enums/deployment";
import { IDeploymentMessage } from "../interfaces/common/IDeploymentMessage";
import { Logger } from "../logger/logger";
import { DeploymentExecutionMaster } from "../deployment/deployment-execution-master";
const cors = require("cors");

export class DeploymentServer {
  private server: Server;
  private io: SocketIO.Server;
  private port: string | number;
  private socket: any;
  constructor(express: any) {
    this.port = process.env.SOCKET_PORT || 9090;
    this.server = createServer(express);
    this.io = socketIo(this.server);
    this.listen();
  }

  private listen(): void {
    this.server.listen(this.port, () => {
      Logger.info(`Running server on port ${this.port}`);
    });
    this.io.on(DeploymentEvent.CONNECT, (socket: any) => {
      Logger.info(`Connected client on port: ${this.port}`);
      this.socket = socket;
      socket.on(DeploymentEvent.KILL, () => {
        DeploymentExecutionMaster.killRequested = true;
        Logger.info("New Client Message");
      });
      socket.on(DeploymentEvent.DISCONNECT, () => {
        Logger.info("Client disconnected");
      });
    });
  }
  static async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public sendMessage(deploymentIdentifier: string, deploymentMessage: IDeploymentMessage) {
    if (this.socket) {
      this.socket.emit(deploymentIdentifier, deploymentMessage);
    }
    Logger.info(`${deploymentIdentifier}`, [deploymentMessage]);
  }
}
