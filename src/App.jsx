import React, { useState, useEffect, useRef } from "react";
import {
  Activity, Cpu, Server, ShieldAlert, HeartPulse,
  Wifi, Database, Zap, AlertTriangle
} from "lucide-react";


/* =========================================
   SIMULATION ENGINE (Mocks the MPI/CUDA Backend)
   ========================================= */
const useSimulatedData = () => {
  const [beds, setBeds] = useState([
    { id: "BED-01", hr: 72, spo2: 98, sys: 120, dia: 80, status: "Stable", history: [] },
    { id: "BED-02", hr: 85, spo2: 97, sys: 115, dia: 75, status: "Stable", history: [] },
    { id: "BED-03", hr: 142, spo2: 88, sys: 90, dia: 55, status: "Critical", history: [] },
    { id: "BED-04", hr: 65, spo2: 99, sys: 130, dia: 85, status: "Stable", history: [] },
  ]);
  
  const [hpcMetrics, setHpcMetrics] = useState({ cpu: 45, gpu: 82, mpiLatency: 4.2, mem: 68 });
  const [alerts, setAlerts] = useState([
    { id: 1, time: "10:42:01", bed: "BED-03", msg: "Ventricular Tachycardia detected", severity: "Critical" }
  ]);

  // Update loop simulating real-time sensor data
  useEffect(() => {
    const interval = setInterval(() => {
      // Update HPC Metrics
      setHpcMetrics(prev => ({
        cpu: Math.min(100, Math.max(10, prev.cpu + (Math.random() * 10 - 5))),
        gpu: Math.min(100, Math.max(40, prev.gpu + (Math.random() * 8 - 4))),
        mpiLatency: Math.max(1.2, prev.mpiLatency + (Math.random() * 1 - 0.5)),
        mem: Math.min(90, Math.max(20, prev.mem + (Math.random() * 2 - 1)))
      }));

      // Update Beds
      setBeds(prevBeds => prevBeds.map(bed => {
        // Random walk for vitals
        let newHr = Math.max(40, Math.min(180, bed.hr + (Math.random() * 6 - 3)));
        let newSpo2 = Math.max(80, Math.min(100, bed.spo2 + (Math.random() * 2 - 1)));
        
        // Force Bed 3 to stay critical for demo
        if (bed.id === "BED-03") {
           newHr = Math.max(130, Math.min(160, newHr));
           newSpo2 = Math.max(85, Math.min(92, newSpo2));
        }

        let newStatus = "Stable";
        if (newHr > 120 || newSpo2 < 90) newStatus = "Critical";
        else if (newHr > 100 || newSpo2 < 94) newStatus = "Warning";

        const history = [...bed.history, { hr: newHr, spo2: newSpo2 }].slice(-30); // Keep last 30 data points

        return {
          ...bed,
          hr: Math.round(newHr),
          spo2: Math.round(newSpo2),
          sys: Math.round(Math.max(80, bed.sys + (Math.random() * 4 - 2))),
          dia: Math.round(Math.max(50, bed.dia + (Math.random() * 3 - 1.5))),
          status: newStatus,
          history
        };
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return { beds, hpcMetrics, alerts };
};

/* =========================================
   COMPONENTS
   ========================================= */

// Live Scrolling ECG SVG
const ECGTrace = ({ status }) => {
  const [offset, setOffset] = useState(0);
  
  useEffect(() => {
    const anim = requestAnimationFrame(() => setOffset(prev => (prev + 2) % 200));
    return () => cancelAnimationFrame(anim);
  }, [offset]);

  const isCritical = status === "Critical";
  const color = isCritical ? "#ef4444" : "#10b981"; // Red for critical, Green for stable

  // Simple ECG generation
  const beat = "l30 0 q8 -10 16 0 l24 0 l6 6 l8 -52 l8 64 l6 -18 l30 0 q14 -16 28 0 l44 0 ";
  const path = "M0 70 " + beat.repeat(10);

  return (
    <div className="h-16 w-full overflow-hidden relative bg-black/50 rounded border border-white/5 mt-3">
      <svg viewBox="0 0 1200 140" className="absolute top-0 h-full" style={{ left: `-${offset}px` }}>
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      </svg>
    </div>
  );
};

// A Single Patient Bed Card
const BedCard = ({ bed }) => {
  const isCritical = bed.status === "Critical";
  const isWarning = bed.status === "Warning";
  
  const borderColor = isCritical ? "border-red-500/50" : isWarning ? "border-yellow-500/50" : "border-white/10";
  const bgColor = isCritical ? "bg-red-500/5" : isWarning ? "bg-yellow-500/5" : "bg-white/[0.02]";
  const textColor = isCritical ? "text-red-400" : isWarning ? "text-yellow-400" : "text-emerald-400";

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} p-5 backdrop-blur-md transition-all duration-300`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-white tracking-wide">{bed.id}</h3>
          <p className="text-xs text-zinc-400 font-mono mt-1">Status: <span className={textColor}>{bed.status.toUpperCase()}</span></p>
        </div>
        <Activity className={textColor} size={20} />
      </div>

      <ECGTrace status={bed.status} />

      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="bg-black/30 p-2 rounded border border-white/5">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">HR</p>
          <p className={`font-mono text-xl ${isCritical ? 'text-red-400' : 'text-white'}`}>{bed.hr}</p>
        </div>
        <div className="bg-black/30 p-2 rounded border border-white/5">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">SpO2</p>
          <p className={`font-mono text-xl ${isCritical ? 'text-red-400' : 'text-white'}`}>{bed.spo2}%</p>
        </div>
        <div className="bg-black/30 p-2 rounded border border-white/5">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">BP</p>
          <p className="font-mono text-sm text-white mt-1">{bed.sys}/{bed.dia}</p>
        </div>
      </div>
    </div>
  );
};

/* =========================================
   MAIN DASHBOARD
   ========================================= */
export default function App() {
  const { beds, hpcMetrics, alerts } = useSimulatedData();
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#05080f] text-zinc-200 font-sans selection:bg-cyan-500/30">
      
      {/* GLOBAL HEADER */}
      <header className="border-b border-white/10 bg-[#0a0f1c] px-6 py-3 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <HeartPulse className="text-cyan-400" size={24} />
          </div>
          <div>
            <h1 className="font-bold text-white tracking-widest uppercase text-sm">VitalWatch<span className="text-cyan-400">.ai</span></h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-wider">HPC CLUSTER MONITORING</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6 text-sm font-mono">
          <div className="flex items-center gap-2 text-emerald-400">
            <Wifi size={16} /> <span>Cluster Online</span>
          </div>
          <div className="text-zinc-400">{currentTime}</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT SIDE: PATIENT GRID (3 columns wide) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Live Patient Wards</h2>
            <div className="flex gap-2 text-xs font-mono">
              <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-zinc-400">{beds.length} Active Beds</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {beds.map(bed => (
              <BedCard key={bed.id} bed={bed} />
            ))}
          </div>
        </div>

        {/* RIGHT SIDE: HPC TELEMETRY & ALERTS (1 column wide) */}
        <div className="space-y-6">
          
          {/* HPC Cluster Health */}
          <div className="rounded-xl border border-white/10 bg-[#0a0f1c] p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Server size={16} className="text-cyan-400"/> MPI Cluster Load
            </h3>
            
            <div className="space-y-4 font-mono text-xs">
              <div>
                <div className="flex justify-between mb-1"><span className="text-zinc-400">CPU Worker Nodes</span><span className="text-white">{Math.round(hpcMetrics.cpu)}%</span></div>
                <div className="h-1.5 bg-black rounded-full overflow-hidden"><div className="h-full bg-cyan-500" style={{ width: `${hpcMetrics.cpu}%` }}/></div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1"><span className="text-zinc-400">CUDA GPU Inference</span><span className="text-white">{Math.round(hpcMetrics.gpu)}%</span></div>
                <div className="h-1.5 bg-black rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${hpcMetrics.gpu}%` }}/></div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/10">
                <div className="bg-black/40 p-2 rounded">
                  <p className="text-zinc-500 text-[10px]">MPI Latency</p>
                  <p className="text-cyan-400 text-sm">{hpcMetrics.mpiLatency.toFixed(1)} ms</p>
                </div>
                <div className="bg-black/40 p-2 rounded">
                  <p className="text-zinc-500 text-[10px]">Shared Mem</p>
                  <p className="text-cyan-400 text-sm">{Math.round(hpcMetrics.mem)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Live Alerts Feed */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <ShieldAlert size={16} className="text-red-400"/> Live Alerts
            </h3>
            <div className="space-y-3">
              {alerts.map(alert => (
                <div key={alert.id} className="bg-black/40 border border-red-500/30 p-3 rounded-lg flex gap-3 items-start">
                  <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-mono text-red-400 font-bold">{alert.bed}</p>
                    <p className="text-xs text-zinc-300 mt-1">{alert.msg}</p>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">{alert.time}</p>
                  </div>
                </div>
              ))}
              <div className="text-center py-2">
                <p className="text-xs text-zinc-500 font-mono animate-pulse">Monitoring all streams...</p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}