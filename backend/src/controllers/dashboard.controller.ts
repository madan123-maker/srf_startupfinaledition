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

export const getStorageStats = async (req: Request, res: Response) => {
  try {
    const { StorageService } = await import('../services/storage/StorageService');
    const stats = await StorageService.getStorageStats();
    return res.status(200).json({
      status: 'ok',
      storage: 'cloudflare-r2',
      ...stats,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch storage statistics' });
  }
};
