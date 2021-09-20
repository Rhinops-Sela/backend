import { validateJson, startDeployment, getForm , downloadOutputs, cleanOutputs} from "../api/deployment-api";
export const deploymentRoutes = require("express").Router();

deploymentRoutes.post("/validate", validateJson);
deploymentRoutes.post("/", startDeployment);
deploymentRoutes.get("/form", getForm);
deploymentRoutes.get("/getoutput", downloadOutputs);
deploymentRoutes.post("/deleteoutput", cleanOutputs);
