import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon, TrendingUp, Maximize2, Minimize2, X } from 'lucide-react';

const MONOCHROME_PALETTE = ['#ffffff', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b'];

export default function ChartCard({ chartData, title = 'Data Insights', type: defaultType = 'bar' }) {
  const [activeChartType, setActiveChartType] = useState(defaultType || 'bar');
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!chartData || !Array.isArray(chartData) || chartData.length === 0) return null;

  const keys = Object.keys(chartData[0]);
  const xAxisKey = keys.find(k => typeof chartData[0][k] === 'string') || keys[0];
  const valueKeys = keys.filter(k => typeof chartData[0][k] === 'number');
  const mainValueKey = valueKeys[0] || keys[1];

  const totalValue = chartData.reduce((acc, item) => acc + (Number(item[mainValueKey]) || 0), 0);
  const avgValue = Math.round((totalValue / chartData.length) * 10) / 10;
  const maxValue = Math.max(...chartData.map(item => Number(item[mainValueKey]) || 0));

  const renderChartCanvas = (heightClass = 'h-64') => (
    <div className={`${heightClass} w-full bg-[#171717]`}>
      <ResponsiveContainer width="100%" height="100%">
        {activeChartType === 'area' || activeChartType === 'line' ? (
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="monoAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
            <XAxis dataKey={xAxisKey} stroke="#737373" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis stroke="#737373" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333333', borderRadius: '0.75rem', color: '#f5f5f5', fontSize: '12px' }} 
            />
            <Area 
              type="monotone" 
              dataKey={mainValueKey} 
              stroke="#ffffff" 
              strokeWidth={2} 
              fillOpacity={1} 
              fill="url(#monoAreaGrad)" 
            />
          </AreaChart>
        ) : activeChartType === 'pie' ? (
          <PieChart>
            <Tooltip 
              contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333333', borderRadius: '0.75rem', color: '#f5f5f5', fontSize: '12px' }} 
            />
            <Pie
              data={chartData}
              dataKey={mainValueKey}
              nameKey={xAxisKey}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={MONOCHROME_PALETTE[index % MONOCHROME_PALETTE.length]} stroke="#171717" strokeWidth={2} />
              ))}
            </Pie>
          </PieChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
            <XAxis dataKey={xAxisKey} stroke="#737373" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis stroke="#737373" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333333', borderRadius: '0.75rem', color: '#f5f5f5', fontSize: '12px' }} 
            />
            <Bar 
              dataKey={mainValueKey} 
              fill="#ffffff" 
              radius={[6, 6, 0, 0]} 
              maxBarSize={45}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );

  return (
    <>
      {/* Inline Standard View */}
      <div className="my-4 rounded-2xl bg-[#171717] border border-[#2a2a2a] overflow-hidden shadow-2xl font-sans">
        <div className="p-4 border-b border-[#262626] flex items-center justify-between bg-[#1f1f1f]/50">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-md bg-white/10 text-white">
                <TrendingUp className="w-4 h-4" />
              </span>
              <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              {chartData.length} Data Points • Metric: <span className="text-slate-200 font-semibold">{mainValueKey}</span>
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Type Controls */}
            <div className="flex items-center space-x-1 p-1 rounded-xl bg-[#121212] border border-[#2a2a2a]">
              <button
                onClick={() => setActiveChartType('bar')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeChartType === 'bar' ? 'bg-[#2a2a2a] text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Bar Chart"
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveChartType('area')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeChartType === 'area' || activeChartType === 'line' ? 'bg-[#2a2a2a] text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Area Chart"
              >
                <LineIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveChartType('pie')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeChartType === 'pie' ? 'bg-[#2a2a2a] text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Donut Chart"
              >
                <PieIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Extension Fullscreen Button */}
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-2 rounded-xl bg-[#121212] hover:bg-[#262626] border border-[#2a2a2a] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Expand Chart View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Inline KPI Summary */}
        <div className="grid grid-cols-3 border-b border-[#262626] bg-[#121212] py-2.5 px-4 text-center divide-x divide-[#262626]">
          <div>
            <div className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider font-mono">Total</div>
            <div className="text-sm font-bold text-slate-100 font-mono mt-0.5">{totalValue.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider font-mono">Average</div>
            <div className="text-sm font-bold text-slate-100 font-mono mt-0.5">{avgValue.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider font-mono">Peak</div>
            <div className="text-sm font-bold text-white font-mono mt-0.5">{maxValue.toLocaleString()}</div>
          </div>
        </div>

        {renderChartCanvas('h-64')}
      </div>

      {/* Expanded Extension Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-3xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden shadow-2xl font-sans">
            <div className="p-6 border-b border-[#262626] flex items-center justify-between bg-[#1c1c1c]">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-white" />
                  <span>{title} (Expanded Analytics)</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-1">Full screen metric insights for {mainValueKey}</p>
              </div>

              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-xl bg-[#262626] hover:bg-[#333333] text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-center">
              {renderChartCanvas('h-[55vh]')}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
