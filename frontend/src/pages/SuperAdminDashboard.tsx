import { API_BASE_URL } from '../config/api';
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
  districtCompliance: { name: string; progress: number }[];
}

interface Edition {
  _id: string;
  name: string;
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444']; // Approved, Submitted, Draft, Rejected
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
        let res = await fetch(`${API_BASE_URL}/api/editions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          res = await fetch(`${API_BASE_URL}/api/editions/public`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
        }
        if (res.ok) {
          const data = await res.json();
          setEditions(data);
          // Auto-select the first edition if available
          if (data.length > 0) {
            setSelectedEdition(data[0]._id || data[0].id);
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
        let url = `${API_BASE_URL}/api/dashboard/metrics`;
        if (selectedEdition && selectedEdition !== 'all') {
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

    fetchMetrics();
  }, [selectedEdition]);

  const { validationMetrics, districtCompliance } = metrics;

  // Formatting data for the Donut Chart dynamically according to edition status counts
  const pieData = [
    { name: 'Approved', value: validationMetrics.approvedApplications || 0, fill: '#10b981' }, 
    { name: 'Submitted / In Review', value: validationMetrics.submittedApplications || 0, fill: '#f59e0b' },
    { name: 'Draft Applications', value: validationMetrics.draftApplications || 0, fill: '#3b82f6' },
    { name: 'Rejected', value: validationMetrics.rejectedApplications || 0, fill: '#ef4444' },
  ];

  const hasPieData = pieData.some(d => d.value > 0);
  const chartData = pieData.filter(d => d.value > 0);

  const hasBarData = districtCompliance && districtCompliance.length > 0;
  const barData = districtCompliance;

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
              <option value="all">All SRF Editions</option>
              {editions.map(ed => (
                <option key={ed._id || (ed as any).id} value={ed._id || (ed as any).id}>{ed.name}</option>
              ))}
            </select>
            <button className="btn-export">
              <Download size={16} /> Export Executive Summary
            </button>
          </div>
        </div>

        {/* Single Row of 5 Real-time Metrics Cards */}
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

      {/* Dynamic Charts Section */}
      <div className="dashboard-panel charts-panel">
        <h3 className="section-title" style={{ padding: '24px 24px 0', margin: 0 }}>
          SRF Edition Status & Progress {selectedEdition && selectedEdition !== 'all' ? `(${editions.find(e => e._id === selectedEdition)?.name || 'Edition View'})` : '(All Editions)'}
        </h3>
        
        <div className="charts-grid">
          {/* Donut Chart */}
          <div className="chart-container">
            <h4 className="chart-title">Application Status Overview</h4>
            <div style={{ height: '300px', width: '100%' }}>
              {hasPieData ? (
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
                        <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  No application data available for this edition.
                </div>
              )}
            </div>
            <div className="chart-legend">
              {pieData.map((entry) => (
                <div key={entry.name} className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: entry.fill }}></span>
                  <span className="legend-text">{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Chart */}
          <div className="chart-container">
            <h4 className="chart-title">District / State Compliance Progress (%)</h4>
            <div style={{ height: '300px', width: '100%' }}>
              {hasBarData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
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
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  No state compliance data available for this edition.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;

