import { validateJson, startDeployment, getForm } from "../api/deployment-api";
export const deploymentRoutes = require("express").Router();

deploymentRoutes.post("/validate", validateJson);
deploymentRoutes.post("/start", startDeployment);
deploymentRoutes.get("/form", getForm);
