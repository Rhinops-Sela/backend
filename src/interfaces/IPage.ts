import { IInput } from './IInput';

export interface IPage {
  name: string;
  displayName: string;
  image: string;
  description: string;
  inputs: IInput[];
  repeatable?: boolean;
  valid?: boolean;
  id?: string;
  modified?: boolean;
  mandatory?: boolean;
}
