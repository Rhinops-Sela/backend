export interface DeploymentMessage {
  message: string;
  totalDomains: number;
  currentDomain: number;
  totalPages: number;
  currentPage: number;
  stdOut?: string;
  final?: true;
}