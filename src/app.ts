import express from "express";
import cors from "cors";
import { deploymentRoutes } from "./routes/deployment-routes";
import { Logger } from "./logger/logger";


const options: cors.CorsOptions = {
  allowedHeaders: [
    "Authorization",
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "X-Access-Token"
  ],
  credentials: true,
  methods: "GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE",
  origin: "*",
  preflightContinue: false
};

// Creates and configures an ExpressJS web server.
class App {
  // ref to Express instance
  public express: express.Application;
  // Run configuration methods on the Express instance.
  constructor() {
    Logger.logLevel = process.env.LOG_ENV || 0;
    this.express = express();
    this.express.use(cors(options));
    this.express.options("*", cors(options));
    this.routes();
  }


  // Configure API endpoints.
  private routes(): void {
    this.express.use(
      "/deployment",
      deploymentRoutes
    );

  }
}

export default new App().express;
