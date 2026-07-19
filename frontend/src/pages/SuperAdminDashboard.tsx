import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import './SuperAdminDashboard.css';

interface DashboardMetrics {
  executiveCommand: {
    totalSubmissions: number;
    pendingFinalReview: number;
    approvedFinal: number;
    rejected: number;
  };
  validationMetrics: {
    totalApplications: number;
    draftApplications: number;
    submittedApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
  };
  districtCompliance: any[];
}

interface Edition {
  _id: string;
  name: string;
}

const COLORS = ['#10b981', '#cbd5e1', '#f59e0b', '#ef4444']; // Approved, Pending, In Progress, Rejected
const BAR_COLOR = '#8b5cf6';

const SuperAdminDashboard: React.FC = () => {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selectedEdition, setSelectedEdition] = useState<string>('');
  const [_loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    executiveCommand: {
      totalSubmissions: 0,
      pendingFinalReview: 0,
      approvedFinal: 0,
      rejected: 0,
    },
    validationMetrics: {
      totalApplications: 0,
      draftApplications: 0,
      submittedApplications: 0,
      approvedApplications: 0,
      rejectedApplications: 0,
    },
    districtCompliance: []
  });

  // Fetch editions on mount
  useEffect(() => {
    const fetchEditions = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5001/api/editions', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setEditions(data);
          // Auto-select the first published one if available, or just the first one
          if (data.length > 0) {
            setSelectedEdition(data[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch editions', err);
      }
    };
    fetchEditions();
  }, []);

  // Fetch metrics when selectedEdition changes
  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        let url = 'http://localhost:5001/api/dashboard/metrics';
        if (selectedEdition) {
          url += `?editionId=${selectedEdition}`;
        }
        
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error('Failed to fetch metrics', err);
      } finally {
        setLoading(false);
      }
    };

    if (selectedEdition !== '') {
      fetchMetrics();
    } else if (editions.length === 0) {
      // If there are no editions at all, just fetch overall metrics
      fetchMetrics();
    }
  }, [selectedEdition, editions.length]);

  const { executiveCommand, validationMetrics, districtCompliance } = metrics;

  // Formatting data for the Donut Chart
  const pieData = [
    { name: 'Approved', value: executiveCommand.approvedFinal || 0 }, 
    { name: 'Pending Review', value: executiveCommand.pendingFinalReview || 0 },
    { name: 'In Progress', value: validationMetrics.draftApplications || 0 },
    { name: 'Rejected', value: executiveCommand.rejected || 0 },
  ];

  // If all values are 0, render a placeholder grey ring
  const hasData = pieData.some(d => d.value > 0);
  const chartData = hasData ? pieData.filter(d => d.value > 0) : [{ name: 'No Data', value: 1, fill: '#e2e8f0' }];

  return (
    <div className="dashboard-container">
      {/* Executive Command Center Panel */}
      <div className="dashboard-panel main-panel">
        <div className="panel-header flex items-center justify-between">
          <div>
            <span className="badge">EXECUTIVE VIEW</span>
            <h1 className="panel-title">Executive Command Center</h1>
            <p className="panel-subtitle">High-level administrative monitoring of compliance rates, risk parameters, and district leaderboards.</p>
          </div>
          <div className="panel-actions flex items-center gap-4">
            <select 
              className="edition-select" 
              value={selectedEdition} 
              onChange={(e) => setSelectedEdition(e.target.value)}
            >
              {editions.length === 0 && <option value="">Loading Editions...</option>}
              {editions.map(ed => (
                <option key={ed._id} value={ed._id}>{ed.name}</option>
              ))}
            </select>
            <button className="btn-export">
              <Download size={16} /> Export Executive Summary
            </button>
          </div>
        </div>

        {/* Top 4 Metric Cards */}
        <div className="metrics-grid grid-4">
          <div className="metric-card">
            <div className="metric-value blue">{executiveCommand.totalSubmissions}</div>
            <div className="metric-label">Total Submissions</div>
          </div>
          <div className="metric-card">
            <div className="metric-value orange">{executiveCommand.pendingFinalReview}</div>
            <div className="metric-label">Pending Final Review</div>
          </div>
          <div className="metric-card">
            <div className="metric-value green">{executiveCommand.approvedFinal}</div>
            <div className="metric-label">Approved (Final)</div>
          </div>
          <div className="metric-card">
            <div className="metric-value red">{executiveCommand.rejected}</div>
            <div className="metric-label">Rejected</div>
          </div>
        </div>
      </div>

      {/* Database Validation Metrics (5 cards) */}
      <div className="validation-section">
        <h3 className="section-title">📊 System Database Validation Metrics (Real-time Counts)</h3>
        <div className="metrics-grid grid-5">
          <div className="validation-card blue-border">
            <div className="metric-value blue">{validationMetrics.totalApplications}</div>
            <div className="metric-label">Total Applications</div>
          </div>
          <div className="validation-card lightblue-border">
            <div className="metric-value lightblue">{validationMetrics.draftApplications}</div>
            <div className="metric-label">Draft Applications</div>
          </div>
          <div className="validation-card yellow-border">
            <div className="metric-value yellow">{validationMetrics.submittedApplications}</div>
            <div className="metric-label">Submitted Applications</div>
          </div>
          <div className="validation-card green-border">
            <div className="metric-value green">{validationMetrics.approvedApplications}</div>
            <div className="metric-label">Approved Applications</div>
          </div>
          <div className="validation-card red-border">
            <div className="metric-value red">{validationMetrics.rejectedApplications}</div>
            <div className="metric-label">Rejected Applications</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="dashboard-panel charts-panel">
        <h3 className="section-title" style={{ padding: '24px 24px 0', margin: 0 }}>SRF Edition Status & Progress</h3>
        
        <div className="charts-grid">
          {/* Donut Chart */}
          <div className="chart-container">
            <h4 className="chart-title">Application Status Overview</h4>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={'fill' in entry ? entry.fill : COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-legend">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: COLORS[index] }}></span>
                  <span className="legend-text">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Chart */}
          <div className="chart-container">
            <h4 className="chart-title">District Compliance Progress (%)</h4>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={districtCompliance} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis 
                    domain={[0, 100]} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12}} 
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip cursor={{fill: '#f1f5f9'}} />
                  <Bar dataKey="progress" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
