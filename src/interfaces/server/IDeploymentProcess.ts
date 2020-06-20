import { ChildProcessWithoutNullStreams } from "child_process";

export interface IDeploymentProcess {
  identifier: string;
  process: ChildProcessWithoutNullStreams;
}