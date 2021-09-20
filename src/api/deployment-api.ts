import { Request, Response } from "express";
import path from "path";
import { Logger } from "../logger/logger";
import { DeploymentExecuter } from "../deployment/deployment-worker";
import { FormParser } from "../deployment/from-parser";
export let validateJson = async (req: Request, res: Response, next: any) => {
  try {
    return res.status(200).json({ status: true });
  } catch (error) {
    next(error);
  }
};

export let downloadOutputs = async (req: Request, res: Response, next: any) => {
  try {
    let folderToDownload = req.query.identifier;
    const folder = path.resolve(__dirname, `../../../../`,`outputs-${folderToDownload}`);
    let fileName = await DeploymentExecuter.compressFolder(folder)
    res.download(path.resolve(fileName));
  } catch (error) {
    Logger.error(error.message, error.stack);
    return res.status(500).json({ error: error.message });
  }
};

export let cleanOutputs = async (req: Request, res: Response, next: any) => {
  try {
    let folderToDownload = req.body.identifier;
    const folder = path.resolve(__dirname, `../../../../`,`outputs-${folderToDownload}`);
    let fileName = await DeploymentExecuter.compressFolder(folder)
    let workingFolderSuffix = folderToDownload.split('.').pop() || "";
    if(workingFolderSuffix[0] == '0') {
      workingFolderSuffix = workingFolderSuffix.substring(1)
    }
    let workingFolder = path.resolve(__dirname, `../../../../`,`working_folder_${workingFolderSuffix.substring(0, workingFolderSuffix.length - 1)}`);
    var rimraf = require("rimraf");
    Logger.info(`Deleting folder: ${folder}`)
    rimraf.sync(folder);
    Logger.info(`Deleting folder: ${fileName}`)
    rimraf.sync(fileName);
    Logger.info(`Deleting folder: ${workingFolder}`)
    rimraf.sync(workingFolder);
  } catch (error) {
    Logger.error(error.message, error.stack);
    return res.status(500).json({ error: error.message });
  }
};

export let startDeployment = async (req: Request, res: Response, next: any) => {
  try {
    const deleteMode = req.body.deleteMode || false;
    const deploymentIdentifier = `deploymentUpdate-${new Date().toISOString()}`;
    const deploymentExecuter = new DeploymentExecuter(
      req.body.form,
      deploymentIdentifier
    );
    const workingFolders = await deploymentExecuter.createWorkingFolders();
    if (req.query.wait) {
      if (deleteMode) {
        await deploymentExecuter.startDeletion(workingFolders);
      } else {
        await deploymentExecuter.startDeployment(workingFolders);
      }
    } else {
      if (deleteMode) {
        deploymentExecuter.startDeletion(workingFolders);
      } else {
        deploymentExecuter.startDeployment(workingFolders);
      }
    }

    return res.status(200).json(deploymentIdentifier);
  } catch (error) {
    Logger.error(error.message, error.stack);
    return res.status(500).json({ error: error.message });
  }
};

export let getForm = async (req: Request, res: Response, next: any) => {
  try {
    Logger.info("Loading Form: Started");
    const form = await FormParser.getForm();
    Logger.info("Loading Form: Completed");
    return res.status(200).json({ form });
  } catch (error) {
    Logger.error("Failed To Read JSON file", error.stack);
    next(error);
  }
};
