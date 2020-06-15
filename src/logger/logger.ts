import { ILogMessage } from "../interfaces/ILogMessage";

export class Logger {
  public static logLevel = process.env.LOG_ENV || 0;

  static debug(message: any, additionalObjects = [], stack?: any) {
    const messageObject: ILogMessage = {
      message: {
        prefix: "DEBUG",
        content: message,
        severity: 1,
      },
      stack: stack,
      additionalObjects: additionalObjects,
    };
    return this.WriteToConsole(messageObject);
  }
  static info(message: any, additionalObjects?: any, stack?: any) {
    const messageObject: ILogMessage = {
      message: {
        prefix: "INFO",
        content: message,
        severity: 0,
      },
      additionalObjects: additionalObjects || [],
      stack: stack,
    };
    return this.WriteToConsole(messageObject);
  }
  static error(message: any, stack: any, additionalObjects = []) {
    const messageObject: ILogMessage = {
      message: {
        prefix: "ERROR",
        content: message,
        severity: -1,
      },
      additionalObjects: additionalObjects,
      stack: stack,
    };
    return this.WriteToConsole(messageObject);
  }

  private static WriteToConsole(messageObject: ILogMessage) {
    try {
      if (messageObject.message.severity > +Logger.logLevel) {
        return 0;
      }
      const linePrefix = `[${messageObject.message.prefix}][${new Date().toLocaleString()}]: `;
      console.log(`${linePrefix}${messageObject.message.content}`);
      if (messageObject.stack && messageObject.stack.length > 2) {
        console.log(`${linePrefix}${messageObject.stack}`);
      }
      if (messageObject.additionalObjects.length > 0) {
        messageObject.additionalObjects.forEach((additionalObject) => {
          console.log(`${linePrefix}`, additionalObject);
        });
      }
      return 1;
    } catch (error) {
      console.log(error);
    }
  }
}
