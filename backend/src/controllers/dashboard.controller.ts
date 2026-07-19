import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';

const dashboardService = new DashboardService();

export const getMetrics = async (req: Request, res: Response) => {
  try {
    const { editionId } = req.query;
    const metrics = await dashboardService.getMetrics(editionId as string);
    return res.status(200).json(metrics);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch dashboard metrics' });
  }
};
