import { Request, Response } from "express";
import path from "path";
import { Logger } from "../logger/logger";
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
    const deploymentExecuter = new DeploymentExecuter(req.body.form, req.body.deploymentIdentifier);
    if (req.query.wait) {
      await deploymentExecuter.startDeployment(req.body.workingFolders);
    } else {
      deploymentExecuter.startDeployment(req.body.workingFolders);
    }
    return res.status(200);
  } catch (error) {
    Logger.error(error.message, error.stack);
    return res.status(500).json({ error: error.message });
  }
};

export let prepareProcess = async (req: Request, res: Response, next: any) => {
  try {
    const deploymentIdentifier = `deploymentUpdate-${new Date().toISOString()}`;
    const deploymentExecuter = new DeploymentExecuter(req.body.form, deploymentIdentifier);
    const workingFolders = await deploymentExecuter.createWorkingFolders();
    return res.status(200).json({ workingFolders: workingFolders, deploymentIdentifier: deploymentIdentifier });
  } catch (error) {
    Logger.error(error.message, error.stack);
    return res.status(500).json({ error: error.message });
  }
};

export let startDeletion = async (req: Request, res: Response, next: any) => {
  try {
    const deploymentExecuter = new DeploymentExecuter(req.body.form, req.body.deploymentIdentifier);
    if (req.query.wait) {
      await deploymentExecuter.startDeletion(req.body.workingFolders);
    } else {
      deploymentExecuter.startDeletion(req.body.workingFolders);
    }
    return res.status(200);
  } catch (error) {
    Logger.error(error.message, error.stack);
    return res.status(500).json({ error: error.message });
  }
};

export let getForm = async (req: Request, res: Response, next: any) => {
  try {
    Logger.info("Loading Form: Started");
    const filePath = path.join(__dirname, process.env.MAIN_TEMPLATE_FORM!);
    Logger.info("Loading Form: Completed");
    return res.sendFile(filePath);
  } catch (error) {
    Logger.error("Failed To Read JSON file", error.stack);
    next(error);
  }
};
