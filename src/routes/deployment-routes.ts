import { validateJson, startDeployment, getForm, startDeletion } from "../api/deployment-api";
export const deploymentRoutes = require("express").Router();

deploymentRoutes.post("/validate", validateJson);
deploymentRoutes.post("/", startDeployment);
deploymentRoutes.delete("/", startDeletion);
deploymentRoutes.get("/form", getForm);
