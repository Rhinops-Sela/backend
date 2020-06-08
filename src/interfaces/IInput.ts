export interface IInput {
  controlType: string;
  tooltip: string;
  displayName: string;
  regexValidation?: string;
  errorMessage?: string;
  options?: string[];
  value?: any;
  required?: boolean;
  serverValue: string;
  id?: string;
}
