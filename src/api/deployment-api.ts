import { Request, Response } from "express";
import path from "path";
import { Logger } from "../logger/logger";
import { DeploymentServer } from "./deployment-socket-api";
import app from "../app";
import { DeploymentExecuter } from "../workers/deployment-worker";
export let validateJson = async (req: Request, res: Response, next: any) => {
  try {
    return res.status(200).json({ status: true });
  } catch (error) {
    next(error);
  }
};

export let startDeployment = async (req: Request, res: Response, next: any) => {
  try {
    const deploymentIdentifier = `deploymentUpdate-${new Date().toISOString()}`;
    try {
      const deploymentExecuter = new DeploymentExecuter(req.body.form, deploymentIdentifier);
      if (req.query.wait) {
        await deploymentExecuter.startDeployment();
      } else {
        deploymentExecuter.startDeployment();
      }

    } catch (error) {
      Logger.info("retrying");
    }
    return res.status(200).json({ deploymentIdentifier: deploymentIdentifier });
  } catch (error) {
    next(error);
  }
};

export let startDeletion = async (req: Request, res: Response, next: any) => {
  try {
    const deploymentIdentifier = `deploymentUpdate-${new Date().toISOString()}`;
    try {
      const deploymentExecuter = new DeploymentExecuter(req.body.form.reverse(), deploymentIdentifier);
      if (req.query.wait) {
        await deploymentExecuter.startDeletion();
      } else {
        deploymentExecuter.startDeletion();
      }
    } catch (error) {
      Logger.info("retrying");
    }
    return res.status(200).json({ deploymentIdentifier: deploymentIdentifier });
  } catch (error) {
    next(error);
  }
};

export let getForm = async (req: Request, res: Response, next: any) => {
  try {
    Logger.info("Loading Form: Started");
    const filePath = path.join(__dirname, process.env.FORM_TEMPLATE_FILE!);
    Logger.info("Loading Form: Completed");
    return res.sendFile(filePath);
  } catch (error) {
    Logger.error("Failed To Read JSON file", error.stack);
    next(error);
  }
};