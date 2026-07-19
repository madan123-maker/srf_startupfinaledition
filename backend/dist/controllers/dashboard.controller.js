"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMetrics = void 0;
const dashboard_service_1 = require("../services/dashboard.service");
const dashboardService = new dashboard_service_1.DashboardService();
const getMetrics = async (req, res) => {
    try {
        const { editionId } = req.query;
        const metrics = await dashboardService.getMetrics(editionId);
        return res.status(200).json(metrics);
    }
    catch (error) {
        return res.status(500).json({ error: error.message || 'Failed to fetch dashboard metrics' });
    }
};
exports.getMetrics = getMetrics;
