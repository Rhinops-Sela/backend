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
    const deploymentExecuter = new DeploymentExecuter(req.body.form, deploymentIdentifier);
    const workingFolders = await deploymentExecuter.createWorkingFolders();
    if (req.query.wait) {
      await deploymentExecuter.startDeployment(workingFolders);
    } else {
      deploymentExecuter.startDeployment(workingFolders);
    }
    return res.status(200).json({ deploymentIdentifier: deploymentIdentifier });
  } catch (error) {
    Logger.error(error.message, error.stack);
    return res.status(500).json({ error: error.message });
  }
};

export let startDeletion = async (req: Request, res: Response, next: any) => {
  try {
    const deploymentIdentifier = `deploymentUpdate-${new Date().toISOString()}`;
    const deploymentExecuter = new DeploymentExecuter(req.body.form, deploymentIdentifier);
    const workingFolders = await deploymentExecuter.createWorkingFolders();
    if (req.query.wait) {
      await deploymentExecuter.startDeletion(workingFolders);
    } else {
      deploymentExecuter.startDeletion(workingFolders);
    }
    return res.status(200).json({ deploymentIdentifier: deploymentIdentifier });
  } catch (error) {
    Logger.error(error.message, error.stack);
    return res.status(500).json({ error: error.message });
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
