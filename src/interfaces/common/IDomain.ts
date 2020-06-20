import { IPage } from './IPage';

export interface IDomain {
  name: string;
  displayName: string;
  icon?: string;
  pages: IPage[];
  valid?: boolean;
  id?: string;
  description: string;
  modified?: boolean;
}
