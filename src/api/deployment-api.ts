import { Request, Response } from "express";
export let validateJson = async (req: Request, res: Response, next: any) => {
  try {
    return res.status(200).json({ status: true });
  } catch (error) {
    next(error);
  }
};

export let startDeployment = async (req: Request, res: Response, next: any) => {
  try {
    return res.status(200).json({ status: true });
  } catch (error) {
    next(error);
  }
};