'use client';

import React, { useState, useEffect } from 'react';
import { 
  Terminal, Play, Save, Code2, Box, Layers, ChevronRight, AlertCircle, 
  Trash2, Plus, Bookmark, StickyNote, ArrowRightLeft, 
  Sun, Moon, Palette, Wallet, CheckCircle2, X
} from 'lucide-react';

// --- WAGMI & RAINBOWKIT IMPORTS ---
import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
  ConnectButton,
  darkTheme,
  lightTheme,
  midnightTheme,
} from '@rainbow-me/rainbowkit';
import { 
  WagmiProvider, 
  useAccount, 
  useWriteContract, 
  usePublicClient,
} from 'wagmi';
import {
  bsc,
  bscTestnet,
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  sepolia,
} from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";
import { parseEther, formatEther } from 'viem';

// --- CONFIGURATION ---
const FALLBACK_WALLETCONNECT_PROJECT_ID = 'YOUR_PROJECT_ID';

const queryClient = new QueryClient();

// --- THEME SYSTEM DEFINITION ---
// 定义一套语义化的颜色映射，而不是硬编码颜色
const APP_THEMES = {
  dark: {
    id: 'dark',
    name: 'Dark',
    rkTheme: darkTheme, // RainbowKit 对应主题
    colors: {
      bgMain: 'bg-slate-950',
      bgSidebar: 'bg-slate-900',
      bgHeader: 'bg-slate-900',
      bgCard: 'bg-slate-800/50',
      bgInput: 'bg-slate-950',
      bgHover: 'hover:bg-slate-800',
      bgActive: 'bg-slate-800 border-l-blue-500',
      border: 'border-slate-800',
      textMain: 'text-slate-200',
      textDim: 'text-slate-500',
      textAccent: 'text-blue-400',
      accentPrimary: 'bg-blue-600 hover:bg-blue-500 text-white',
      accentSecondary: 'bg-blue-900/30 text-blue-400 border-blue-800',
      success: 'text-emerald-400',
      error: 'text-red-400',
      info: 'text-blue-400'
    }
  },
  light: {
    id: 'light',
    name: 'Light',
    rkTheme: lightTheme,
    colors: {
      bgMain: 'bg-slate-50',
      bgSidebar: 'bg-white',
      bgHeader: 'bg-white',
      bgCard: 'bg-slate-100',
      bgInput: 'bg-white',
      bgHover: 'hover:bg-slate-100',
      bgActive: 'bg-blue-50 border-l-blue-500',
      border: 'border-slate-200',
      textMain: 'text-slate-800',
      textDim: 'text-slate-500',
      textAccent: 'text-blue-600',
      accentPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
      accentSecondary: 'bg-blue-100 text-blue-700 border-blue-200',
      success: 'text-emerald-600',
      error: 'text-red-600',
      info: 'text-blue-600'
    }
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    rkTheme: midnightTheme,
    colors: {
      bgMain: 'bg-[#0f172a]', // Slate 900
      bgSidebar: 'bg-[#1e293b]', // Slate 800
      bgHeader: 'bg-[#1e293b]',
      bgCard: 'bg-[#334155]/50', // Slate 700
      bgInput: 'bg-[#0f172a]',
      bgHover: 'hover:bg-[#334155]',
      bgActive: 'bg-[#334155] border-l-cyan-400',
      border: 'border-[#334155]', // Slate 700
      textMain: 'text-slate-100',
      textDim: 'text-slate-400',
      textAccent: 'text-cyan-400',
      accentPrimary: 'bg-cyan-600 hover:bg-cyan-500 text-white',
      accentSecondary: 'bg-cyan-900/30 text-cyan-400 border-cyan-800',
      success: 'text-emerald-400',
      error: 'text-rose-400',
      info: 'text-cyan-400'
    }
  }
};

type ThemeKey = keyof typeof APP_THEMES;
type ThemeConfig = typeof APP_THEMES['dark']['colors'];

// --- TYPES ---
type ABIFunction = {
  name: string;
  type: 'function';
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
  inputs: ABIParam[];
  outputs: ABIParam[];
};

type ABIParam = {
  name: string;
  type: string;
  components?: ABIParam[]; // For tuples
  internalType?: string;
};

type LogEntry = {
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  data?: any;
};

type SavedContract = {
  id: string;
  name: string;
  address: string;
  abi: string;
  networkId?: string;
  createdAt: number;
  notes?: Record<string, string>;
};

// --- DYNAMIC INPUT COMPONENT ---
const DynamicInput = ({ 
  type, name, value, onChange, components, depth = 0, colors 
}: { 
  type: string; name: string; value: any; onChange: (val: any) => void; components?: ABIParam[]; depth?: number; colors: ThemeConfig 
}) => {
  const isArray = type.endsWith('[]');
  const isTuple = type.startsWith('tuple') || (type === 'tuple' && components);
  
  // Common styles extracted from theme
  const inputClass = `w-full ${colors.bgInput} ${colors.border} border ${colors.textMain} text-sm rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono transition-all placeholder:text-slate-400`;
  const containerClass = `ml-${depth * 2} mb-4 p-3 border ${colors.border} rounded-lg ${colors.bgCard}`;

  // 1. 处理数组
  if (isArray) {
    const baseType = type.slice(0, -2);
    const arrValue = Array.isArray(value) ? value : [];
    return (
      <div className={containerClass}>
        <div className="flex justify-between items-center mb-2">
          <label className={`text-xs font-mono ${colors.textDim} block`}>
            {name || 'param'} <span className="text-amber-500">[{baseType}]</span> (Array)
          </label>
          <button onClick={() => onChange([...arrValue, ''])} className={`text-xs ${colors.accentPrimary} px-2 py-1 rounded flex items-center gap-1 transition-colors`}>
            <Plus size={12} /> Add
          </button>
        </div>
        {arrValue.map((item: any, idx: number) => (
          <div key={idx} className="flex gap-2 items-start mb-2">
            <div className="flex-1">
              <DynamicInput type={baseType} name={`[${idx}]`} value={item} components={components} depth={depth + 1} onChange={(newVal) => {
                  const newArr = [...arrValue]; newArr[idx] = newVal; onChange(newArr);
                }} colors={colors} />
            </div>
            <button onClick={() => { const newArr = arrValue.filter((_: any, i: number) => i !== idx); onChange(newArr); }} 
              className={`mt-1 p-1 ${colors.textDim} hover:text-red-500 rounded transition-colors`}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    );
  }

  // 2. 处理 Tuple/Struct
  if (isTuple && components) {
    const objValue = typeof value === 'object' && value !== null ? value : {};
    return (
      <div className={containerClass}>
        <div className={`text-xs font-mono ${colors.textAccent} mb-2 border-b ${colors.border} pb-1`}>
          {name || 'struct'} <span className={colors.textDim}>(Tuple)</span>
        </div>
        {components.map((comp, idx) => (
          <DynamicInput key={idx} type={comp.type} name={comp.name} value={objValue[idx]} components={comp.components} depth={depth + 1} onChange={(newVal) => {
              const newObj = Array.isArray(objValue) ? [...objValue] : []; newObj[idx] = newVal; onChange(newObj);
            }} colors={colors} />
        ))}
      </div>
    );
  }

  // 3. 处理基础类型 (含 Wei 转换器)
  const isNumeric = type.startsWith('uint') || type.startsWith('int');

  return (
    <div className="mb-3">
      <div className="flex justify-between items-end mb-1">
        <label className={`text-xs font-mono ${colors.textDim} block`}>{name} <span className="opacity-70">({type})</span></label>
        {isNumeric && (
          <div className="flex gap-1 opacity-90">
             <button type="button" onClick={() => { try { if (value) onChange(parseEther(value.toString()).toString()); } catch (e) {} }}
                 className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 ${colors.bgCard} border ${colors.border} rounded ${colors.info} hover:brightness-110 transition-colors`}>ETH <ArrowRightLeft size={8} /> Wei</button>
             <button type="button" onClick={() => { try { if (value) onChange(formatEther(BigInt(value.toString()))); } catch (e) {} }}
                 className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 ${colors.bgCard} border ${colors.border} rounded ${colors.success} hover:brightness-110 transition-colors`}>Wei <ArrowRightLeft size={8} /> ETH</button>
          </div>
        )}
      </div>
      <select 
        value={type === 'bool' ? (value === true ? 'true' : 'false') : undefined}
        onChange={type === 'bool' ? (e) => onChange(e.target.value === 'true') : undefined}
        className={inputClass} style={{ display: type === 'bool' ? 'block' : 'none' }}
      >
        <option value="false">false</option>
        <option value="true">true</option>
      </select>
      {type !== 'bool' && (
        <input type="text" value={value || ''} placeholder={`${type} value...`} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      )}
    </div>
  );
};

// --- MAIN CONTENT COMPONENT ---
function DebuggerContent() {
  // Wagmi Hooks
  const { address: walletAddress, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  
  // App State
  const [contractName, setContractName] = useState('My Contract');
  const [address, setAddress] = useState('');
  const [abiInput, setAbiInput] = useState('');
  const [parsedAbi, setParsedAbi] = useState<ABIFunction[]>([]);
  const [selectedFunc, setSelectedFunc] = useState<ABIFunction | null>(null);
  const [funcArgs, setFuncArgs] = useState<any[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Storage State
  const [activeContractId, setActiveContractId] = useState<string | null>(null);
  const [functionNotes, setFunctionNotes] = useState<Record<string, string>>({});
  const [activeSidebarTab, setActiveSidebarTab] = useState<'read' | 'write' | 'saved'>('read');
  const [savedContracts, setSavedContracts] = useState<SavedContract[]>([]);
  
  // Theme State
  const [currentThemeKey, setCurrentThemeKey] = useState<ThemeKey>('dark');
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const t = APP_THEMES[currentThemeKey].colors; 

  // Init Data
  useEffect(() => {
    const stored = localStorage.getItem('debugger_contracts');
    if (stored) { try { setSavedContracts(JSON.parse(stored)); } catch (e) {} }
    
    const storedTheme = localStorage.getItem('debugger_theme') as ThemeKey;
    if (storedTheme && APP_THEMES[storedTheme]) { setCurrentThemeKey(storedTheme); }
  }, []);

  // --- ACTIONS ---

  const switchTheme = (key: ThemeKey) => {
    setCurrentThemeKey(key);
    localStorage.setItem('debugger_theme', key);
    setIsThemeMenuOpen(false);
  };

  const addLog = (type: LogEntry['type'], message: string, data?: any) => {
    setLogs(prev => [{ timestamp: new Date(), type, message, data }, ...prev]);
  };

  const saveContract = () => {
    if (!address || !abiInput) { addLog('error', 'Address and ABI required'); return; }
    const newContract: SavedContract = {
        id: activeContractId || crypto.randomUUID(),
        name: contractName || 'Untitled',
        address, abi: abiInput, networkId: chainId?.toString(), createdAt: Date.now(), notes: functionNotes
    };
    if (activeContractId) {
        const updated = savedContracts.map(c => c.id === activeContractId ? newContract : c);
        setSavedContracts(updated); localStorage.setItem('debugger_contracts', JSON.stringify(updated));
        addLog('success', `Updated: ${newContract.name}`);
    } else {
        const updated = [newContract, ...savedContracts];
        setSavedContracts(updated); localStorage.setItem('debugger_contracts', JSON.stringify(updated));
        addLog('success', `Saved: ${newContract.name}`);
        setActiveContractId(newContract.id);
    }
    setActiveSidebarTab('saved');
  };

  const loadContract = (contract: SavedContract) => {
    setContractName(contract.name); setAddress(contract.address); setAbiInput(contract.abi); setFunctionNotes(contract.notes || {});
    setActiveContractId(contract.id); addLog('info', `Loaded: ${contract.name}`); setActiveSidebarTab('read');
  };

  const deleteContract = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedContracts.filter(c => c.id !== id);
    setSavedContracts(updated); localStorage.setItem('debugger_contracts', JSON.stringify(updated));
    if (activeContractId === id) { setActiveContractId(null); setContractName('My Contract'); setAddress(''); setAbiInput(''); setFunctionNotes({}); }
  };

  useEffect(() => {
    if (!abiInput) return;
    try { const parsed = JSON.parse(abiInput.trim()); setParsedAbi(parsed.filter((item: any) => item.type === 'function')); } catch (e) {}
  }, [abiInput]);

  const executeFunction = async () => {
    if (!selectedFunc || !publicClient) {
      if (!publicClient) addLog('error', 'Network client not ready');
      return;
    }
    const formattedArgs = funcArgs.map(arg => typeof arg === 'string' ? arg.trim() : arg);
    setIsLoading(true); addLog('info', `Calling ${selectedFunc.name}...`, formattedArgs);
    
    try {
      if (['view', 'pure'].includes(selectedFunc.stateMutability)) {
        // READ
        const result = await publicClient.readContract({
          address: address as `0x${string}`,
          abi: [selectedFunc],
          functionName: selectedFunc.name,
          args: formattedArgs
        });
        addLog('success', `Result (${selectedFunc.name})`, JSON.stringify(result, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
      } else {
        // WRITE
        if (!walletAddress) throw new Error("Connect Wallet");
        const hash = await writeContractAsync({
          address: address as `0x${string}`,
          abi: [selectedFunc],
          functionName: selectedFunc.name,
          args: formattedArgs,
        });
        addLog('info', 'Transaction sent', { hash });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        addLog('success', 'Confirmed', { status: receipt.status, block: receipt.blockNumber.toString(), hash: receipt.transactionHash || hash });
      }
    } catch (err: any) {
      console.error(err);
      addLog('error', 'Failed', err.shortMessage || err.message);
    } finally { setIsLoading(false); }
  };

  const readFunctions = parsedAbi.filter(f => ['view', 'pure'].includes(f.stateMutability));
  const writeFunctions = parsedAbi.filter(f => !['view', 'pure'].includes(f.stateMutability));
  const activeFunctions = activeSidebarTab === 'read' ? readFunctions : writeFunctions;

  return (
    <RainbowKitProvider theme={APP_THEMES[currentThemeKey].rkTheme()}>
    <div className={`flex flex-col h-screen font-sans overflow-hidden transition-colors duration-300 ${t.bgMain} ${t.textMain}`}>
      
      {/* HEADER */}
      <header className={`h-16 border-b ${t.border} ${t.bgHeader} flex items-center justify-between px-6 shrink-0 z-10 transition-colors duration-300`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Code2 size={20} className="text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">Contract<span className="text-blue-500">Debugger</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Theme Switcher */}
          <div className="relative">
            <button onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)} className={`p-2 rounded-lg border ${t.border} ${t.bgCard} ${t.textDim} hover:${t.textMain} transition-colors`}>
              {currentThemeKey === 'dark' && <Moon size={18} />}
              {currentThemeKey === 'light' && <Sun size={18} />}
              {currentThemeKey === 'ocean' && <Palette size={18} />}
            </button>
            {isThemeMenuOpen && (
              <div className={`absolute top-full right-0 mt-2 w-32 ${t.bgHeader} border ${t.border} rounded-lg shadow-xl overflow-hidden py-1 z-50`}>
                {(Object.keys(APP_THEMES) as ThemeKey[]).map(key => (
                  <button key={key} onClick={() => switchTheme(key)} className={`w-full text-left px-4 py-2 text-sm ${t.textMain} hover:${t.bgCard} flex items-center gap-2`}>
                    {key === 'dark' && <Moon size={14} />}
                    {key === 'light' && <Sun size={14} />}
                    {key === 'ocean' && <Palette size={14} />}
                    {APP_THEMES[key].name}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <ConnectButton accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }} showBalance={false} />
        </div>
      </header>

      {/* MAIN */}
      <main className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className={`w-96 border-r ${t.border} ${t.bgSidebar} flex flex-col shrink-0 z-0 transition-colors duration-300`}>
          <div className={`p-4 border-b ${t.border} space-y-3`}>
             <div className="flex gap-2">
                <input type="text" value={contractName} onChange={(e) => setContractName(e.target.value)} placeholder="Contract Name" 
                  className={`flex-1 ${t.bgInput} border ${t.border} ${t.textMain} rounded p-2 text-sm font-semibold focus:ring-1 focus:ring-blue-500 outline-none`} />
                <button onClick={saveContract} className={`border ${t.border} p-2 rounded ${activeContractId ? t.accentSecondary : `${t.bgCard} ${t.textDim}`}`}><Save size={18} /></button>
             </div>
            <input type="text" value={address} onChange={(e) => { setAddress(e.target.value); if(activeContractId) setActiveContractId(null); }} placeholder="0x... (Contract Address)" 
                className={`w-full ${t.bgInput} border ${t.border} ${t.textMain} rounded p-2 text-sm font-mono focus:ring-1 focus:ring-blue-500 outline-none`} />
            <div className="relative group">
              <textarea value={abiInput} onChange={(e) => { setAbiInput(e.target.value); if(activeContractId) setActiveContractId(null); }} placeholder='Paste ABI JSON here...' 
                className={`w-full h-16 ${t.bgInput} border ${t.border} ${t.textMain} rounded p-2 text-xs font-mono focus:ring-1 focus:ring-blue-500 outline-none resize-none transition-all focus:h-32`} />
              <div className={`absolute bottom-2 right-2 text-[10px] ${t.textDim} ${t.bgInput} px-1 rounded pointer-events-none`}>ABI</div>
            </div>
          </div>

          <div className={`flex border-b ${t.border} ${t.bgSidebar}`}>
            {['read', 'write', 'saved'].map(tab => (
              <button key={tab} onClick={() => setActiveSidebarTab(tab as any)} 
                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1 
                  ${activeSidebarTab === tab ? `border-b-2 border-blue-500 ${t.textAccent}` : `${t.textDim} hover:${t.textMain}`}`}>
                {tab === 'saved' ? <Bookmark size={12} /> : tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeSidebarTab === 'saved' ? (
              <div className="p-2 space-y-2">
                {savedContracts.map(c => (
                  <div key={c.id} onClick={() => loadContract(c)} className={`p-3 rounded border cursor-pointer group relative ${activeContractId === c.id ? `${t.bgActive} border-blue-500/30` : `${t.bgCard} ${t.border} ${t.bgHover}`}`}>
                    <div className="flex justify-between items-start mb-1">
                      <div className={`font-bold text-sm ${t.textMain} truncate pr-2`}>{c.name}</div>
                      <button onClick={(e) => deleteContract(c.id, e)} className={`${t.textDim} hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity`}><Trash2 size={14} /></button>
                    </div>
                    <div className={`text-xs font-mono ${t.textDim} truncate`}>{c.address}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {activeFunctions.map((func, idx) => (
                  <button key={idx} onClick={() => { setSelectedFunc(func); setFuncArgs(new Array(func.inputs.length).fill('')); }} 
                    className={`w-full text-left px-4 py-3 border-b ${t.border} ${t.bgHover} transition-colors flex items-center justify-between group ${selectedFunc === func ? `${t.bgActive}` : ''}`}>
                    <div className={`flex items-center gap-2 truncate pr-2 font-mono text-sm ${t.textMain}`}>
                        {func.name} {functionNotes[func.name] && <StickyNote size={12} className="text-amber-500" />}
                    </div>
                    <ChevronRight size={14} className={`${t.textDim} opacity-0 group-hover:opacity-100`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* EXECUTION PANEL */}
        <section className={`flex-1 flex flex-col ${t.bgMain} relative overflow-hidden transition-colors duration-300`}>
          {selectedFunc ? (
            <div className="flex flex-col h-full">
              <div className={`p-6 border-b ${t.border} ${t.bgHeader}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${['view', 'pure'].includes(selectedFunc.stateMutability) ? t.accentSecondary : 'bg-orange-900/30 text-orange-400 border border-orange-800'}`}>
                    {selectedFunc.stateMutability}
                  </span>
                  <h2 className={`text-xl font-bold font-mono ${t.textMain}`}>{selectedFunc.name}</h2>
                </div>
                <div className="relative group mt-4">
                    <textarea value={functionNotes[selectedFunc.name] || ''} onChange={(e) => {
                        const newNotes = { ...functionNotes, [selectedFunc.name]: e.target.value }; setFunctionNotes(newNotes);
                        if (activeContractId) { const u = savedContracts.map(c => c.id === activeContractId ? { ...c, notes: newNotes } : c); setSavedContracts(u); localStorage.setItem('debugger_contracts', JSON.stringify(u)); }
                    }} placeholder="Add notes..." className={`w-full ${t.bgInput} border ${t.border} rounded py-1.5 px-2 text-xs ${t.textMain} outline-none resize-none h-8 focus:h-20 transition-all placeholder:text-slate-500`} />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto space-y-6">
                  {selectedFunc.inputs.map((input, idx) => (
                    <DynamicInput key={idx} type={input.type} name={input.name} value={funcArgs[idx]} components={input.components} colors={t}
                      onChange={(val) => { const newArgs = [...funcArgs]; newArgs[idx] = val; setFuncArgs(newArgs); }} />
                  ))}
                  {selectedFunc.inputs.length === 0 && <div className={`${t.textDim} italic p-4 ${t.bgCard} rounded border ${t.border} flex gap-2`}><Box size={16}/> No arguments</div>}
                </div>
              </div>

              <div className={`p-6 border-t ${t.border} ${t.bgHeader}`}>
                <div className="max-w-3xl mx-auto flex items-center gap-4">
                  <button onClick={executeFunction} disabled={isLoading || (!walletAddress && !['view', 'pure'].includes(selectedFunc.stateMutability))}
                    className={`flex-1 py-3 px-6 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg 
                      ${isLoading ? 'bg-slate-500 cursor-not-allowed' : t.accentPrimary}`}>
                    {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Play size={18} fill="currentColor" /> Run</>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`h-full flex flex-col items-center justify-center ${t.textDim}`}>
              <Layers size={32} className="opacity-50 mb-4" /> <p>Select a function to inspect</p>
            </div>
          )}
        </section>

        {/* CONSOLE */}
        <aside className={`w-80 border-l ${t.border} ${t.bgSidebar} flex flex-col shrink-0 transition-colors duration-300`}>
           <div className={`p-3 border-b ${t.border} flex items-center justify-between ${t.bgHeader}`}>
            <div className={`flex items-center gap-2 ${t.textMain} text-sm font-semibold`}><Terminal size={16} /> Console</div>
            <button onClick={() => setLogs([])} className={`text-xs ${t.textDim} hover:text-red-500`}>Clear</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
            {logs.map((log, idx) => (
              <div key={idx} className={`border-l-2 ${t.border} pl-3 py-1`}>
                <div className={`flex items-center gap-2 mb-1 ${t.textDim}`}>
                  <span>[{log.timestamp.toLocaleTimeString()}]</span>
                  <span className={log.type === 'success' ? t.success : log.type === 'error' ? t.error : t.info}>{log.type.toUpperCase()}</span>
                </div>
                <div className={`${t.textMain} break-words`}>{log.message}</div>
                {log.data && <pre className={`${t.bgInput} p-2 rounded mt-2 overflow-x-auto ${t.textDim} border ${t.border}`}>{typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}</pre>}
              </div>
            ))}
          </div>
        </aside>
      </main>
    </div>
    </RainbowKitProvider>
  );
}

// --- ROOT WRAPPER ---
export default function ContractDebuggerPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [wagmiConfig, setWagmiConfig] = useState<ReturnType<typeof getDefaultConfig> | null>(null);
  const [projectIdReady, setProjectIdReady] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() || FALLBACK_WALLETCONNECT_PROJECT_ID;
    const hasValidProjectId = projectId !== FALLBACK_WALLETCONNECT_PROJECT_ID;
    setProjectIdReady(hasValidProjectId);

    if (!hasValidProjectId) {
      console.warn("WalletConnect Project ID 未配置，请在 Vercel 环境变量中设置 NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID。");
    }

    setWagmiConfig(
      getDefaultConfig({
        appName: 'Universal Contract Debugger',
        projectId,
        chains: [mainnet, polygon, optimism, arbitrum, base, sepolia, bsc, bscTestnet],
        ssr: false,
      })
    );
  }, []);

  // 仅在客户端初始化 wagmi，避免构建/预渲染阶段触发 indexedDB
  if (!isMounted || !wagmiConfig) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-200">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {!projectIdReady && (
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] px-3 py-2 rounded-md text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30">
            请在 Vercel 设置 `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`，否则钱包连接不可用。
          </div>
        )}
        <DebuggerContent />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
