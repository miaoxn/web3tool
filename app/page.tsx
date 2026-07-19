'use client';

import React, { useState, useEffect } from 'react';
import {
  Terminal, Play, Save, Code2, Box, Layers, ChevronRight,
  Trash2, Plus, Bookmark, StickyNote, ArrowRightLeft, 
  Sun, Moon, Palette, Activity, Braces, CircleDot, GripVertical,
  UserRound, Flame, Search, Copy, ExternalLink, PanelBottom, X, AlertTriangle
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
  useSwitchChain,
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
import { decodeErrorResult, parseEther, formatEther, getAddress, isAddress, type Hex } from 'viem';

// --- CONFIGURATION ---
const FALLBACK_WALLETCONNECT_PROJECT_ID = 'YOUR_PROJECT_ID';
const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';
const SUPPORTED_CHAINS = [mainnet, polygon, optimism, arbitrum, base, sepolia, bsc, bscTestnet] as const;

const functionKey = (func: ABIFunction) => `${func.name}(${func.inputs.map(input => input.type).join(',')})`;

const validateParamValue = (param: ABIParam, value: unknown): string | null => {
  if (param.type.endsWith('[]')) {
    if (!Array.isArray(value)) return 'Expected an array';
    const baseParam = { ...param, type: param.type.slice(0, -2) };
    for (const item of value) {
      const error = validateParamValue(baseParam, item);
      if (error) return error;
    }
    return null;
  }
  if (param.type.startsWith('tuple')) {
    if (!Array.isArray(value)) return 'Complete all tuple fields';
    return param.components?.map((component, index) => validateParamValue(component, value[index])).find(Boolean) || null;
  }
  if (param.type === 'bool') return null;
  if (value === undefined || value === null || value === '') return 'Required value';
  const text = String(value).trim();
  if (param.type === 'address' && !isAddress(text, { strict: false })) return 'Invalid address';
  const integerType = param.type.match(/^(uint|int)(\d*)$/);
  if (integerType && !/^-?\d+$/.test(text)) return 'Enter an integer';
  if (integerType) {
    try {
      const numericValue = BigInt(text);
      const bits = BigInt(integerType[2] || '256');
      const unsigned = integerType[1] === 'uint';
      const zero = BigInt(0);
      const one = BigInt(1);
      const two = BigInt(2);
      const min = unsigned ? zero : -(two ** (bits - one));
      const max = unsigned ? two ** bits - one : two ** (bits - one) - one;
      if (numericValue < min || numericValue > max) return `Value is outside ${param.type} range`;
    } catch { return 'Enter a valid integer'; }
  }
  const fixedBytes = param.type.match(/^bytes(\d+)$/);
  if (fixedBytes && !new RegExp(`^0x[0-9a-fA-F]{${Number(fixedBytes[1]) * 2}}$`).test(text)) return `${param.type} requires exactly ${Number(fixedBytes[1]) * 2} hex characters`;
  if (param.type === 'bytes' && !/^0x(?:[0-9a-fA-F]{2})*$/.test(text)) return 'Bytes must be 0x-prefixed, even-length hex';
  return null;
};

const queryClient = new QueryClient();

// --- THEME SYSTEM DEFINITION ---
// 定义一套语义化的颜色映射，而不是硬编码颜色
const APP_THEMES = {
  dark: {
    id: 'dark',
    name: 'Dark',
    rkTheme: darkTheme, // RainbowKit 对应主题
    colors: {
      bgMain: 'bg-[#070b14]',
      bgSidebar: 'bg-[#0b111f]',
      bgHeader: 'bg-[#0d1423]/95',
      bgCard: 'bg-slate-800/40',
      bgInput: 'bg-[#080d18]',
      bgHover: 'hover:bg-slate-800/60',
      bgActive: 'bg-blue-500/10 border-l-blue-400',
      border: 'border-slate-800/80',
      textMain: 'text-slate-100',
      textDim: 'text-slate-400',
      textAccent: 'text-blue-400',
      accentPrimary: 'bg-blue-600 hover:bg-blue-500 text-white',
      accentSecondary: 'bg-blue-500/10 text-blue-300 border-blue-500/25',
      success: 'text-emerald-400',
      error: 'text-red-400',
      info: 'text-blue-400',
      badgeRead: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25',
      badgeWrite: 'bg-violet-500/10 text-violet-300 border-violet-500/25',
      badgePayable: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
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
      info: 'text-blue-600',
      badgeRead: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      badgeWrite: 'bg-violet-50 text-violet-700 border-violet-200',
      badgePayable: 'bg-emerald-50 text-emerald-700 border-emerald-200'
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
      info: 'text-cyan-400',
      badgeRead: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/25',
      badgeWrite: 'bg-indigo-400/10 text-indigo-300 border-indigo-400/25',
      badgePayable: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/25'
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

type ABIErrorDefinition = {
  name: string;
  type: 'error';
  inputs: ABIParam[];
};

type DecodedContractError = {
  errorName: string;
  signature: string;
  args?: unknown;
  raw?: Hex;
};

const toSerializable = (value: unknown): unknown => {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(toSerializable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toSerializable(item)]));
  return value;
};

const decodeContractError = (error: unknown, abiErrors: ABIErrorDefinition[]): DecodedContractError | null => {
  let current: unknown = error;
  for (let depth = 0; depth < 8 && current && typeof current === 'object'; depth += 1) {
    const record = current as Record<string, unknown>;
    const decoded = record.data;
    if (decoded && typeof decoded === 'object') {
      const decodedRecord = decoded as Record<string, unknown>;
      if (typeof decodedRecord.errorName === 'string') {
        const definition = abiErrors.find(item => item.name === decodedRecord.errorName);
        return {
          errorName: decodedRecord.errorName,
          signature: definition ? `${definition.name}(${definition.inputs.map(input => input.type).join(',')})` : decodedRecord.errorName,
          args: toSerializable(decodedRecord.args),
          raw: typeof record.raw === 'string' ? record.raw as Hex : undefined,
        };
      }
    }

    const nestedData = decoded && typeof decoded === 'object' ? (decoded as Record<string, unknown>).data : undefined;
    const raw = [record.raw, decoded, nestedData].find(value => typeof value === 'string' && value.startsWith('0x')) as Hex | undefined;
    if (raw) {
      try {
        const result = decodeErrorResult({ abi: abiErrors, data: raw });
        const definition = abiErrors.find(item => item.name === result.errorName);
        return {
          errorName: result.errorName,
          signature: definition ? `${definition.name}(${definition.inputs.map(input => input.type).join(',')})` : result.errorName,
          args: toSerializable(result.args),
          raw,
        };
      } catch {}
    }
    current = record.cause;
  }
  return null;
};

type LogEntry = {
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  data?: any;
};

type ExecutionResult = {
  type: 'info' | 'success' | 'error';
  title: string;
  data?: unknown;
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
  type, name, value, onChange, onBlur, components, depth = 0, colors, currentUserAddress, error
}: { 
  type: string; name: string; value: any; onChange: (val: any) => void; onBlur?: () => void; components?: ABIParam[]; depth?: number; colors: ThemeConfig; currentUserAddress?: string; error?: string | null
}) => {
  const isArray = type.endsWith('[]');
  const isTuple = type.startsWith('tuple') || (type === 'tuple' && components);
  
  // Common styles extracted from theme
  const inputClass = `w-full ${colors.bgInput} ${error ? 'border-red-500/60' : colors.border} border ${colors.textMain} text-sm rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/70 outline-none font-mono transition-all placeholder:text-slate-600`;
  const containerClass = `ml-${depth * 2} mb-4 p-4 border ${colors.border} rounded-2xl ${colors.bgCard} shadow-sm`;

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
          <button onClick={() => onChange([...arrValue, ''])} className={`text-xs ${colors.accentSecondary} border px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors`}>
            <Plus size={12} /> Add
          </button>
        </div>
        {arrValue.map((item: any, idx: number) => (
          <div key={idx} className="flex gap-2 items-start mb-2">
            <div className="flex-1">
              <DynamicInput type={baseType} name={`[${idx}]`} value={item} components={components} depth={depth + 1} onChange={(newVal) => {
                  const newArr = [...arrValue]; newArr[idx] = newVal; onChange(newArr);
                }} onBlur={onBlur} colors={colors} currentUserAddress={currentUserAddress} />
            </div>
            <button onClick={() => { const newArr = arrValue.filter((_: any, i: number) => i !== idx); onChange(newArr); }} 
              aria-label={`Remove ${name || 'array'} item ${idx + 1}`} className={`mt-1 p-1.5 ${colors.textDim} hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors`}><Trash2 size={14} /></button>
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
            }} onBlur={onBlur} colors={colors} currentUserAddress={currentUserAddress} />
        ))}
      </div>
    );
  }

  // 3. 处理基础类型 (含 Wei 转换器)
  const isNumeric = type.startsWith('uint') || type.startsWith('int');
  const isAddressType = type === 'address';

  return (
    <div className="mb-4">
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
        {isAddressType && (
          <div className="flex gap-1 opacity-90">
            <button
              type="button"
              disabled={!currentUserAddress}
              title={currentUserAddress ? 'Use connected wallet address' : 'Connect wallet to use Self'}
              onClick={() => currentUserAddress && onChange(currentUserAddress)}
              className={`flex items-center gap-1 text-[10px] px-2 py-1 ${colors.bgCard} border ${colors.border} rounded-md ${colors.info} hover:border-blue-500/50 disabled:opacity-40 disabled:hover:border-inherit transition-colors`}
            >
              <UserRound size={10} /> Self
            </button>
            <button
              type="button"
              title="Use the standard burn address"
              onClick={() => onChange(DEAD_ADDRESS)}
              className={`flex items-center gap-1 text-[10px] px-2 py-1 ${colors.bgCard} border ${colors.border} rounded-md text-orange-400 hover:border-orange-500/50 transition-colors`}
            >
              <Flame size={10} /> Dead
            </button>
          </div>
        )}
      </div>
      <select 
        value={type === 'bool' ? (value === true ? 'true' : 'false') : undefined}
        onChange={type === 'bool' ? (e) => onChange(e.target.value === 'true') : undefined}
        onBlur={onBlur}
        className={inputClass} style={{ display: type === 'bool' ? 'block' : 'none' }}
      >
        <option value="false">false</option>
        <option value="true">true</option>
      </select>
      {type !== 'bool' && (
        <input type="text" value={value || ''} placeholder={`${type} value...`} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} className={inputClass} />
      )}
      {error && <p className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1"><AlertTriangle size={11} />{error}</p>}
    </div>
  );
};

// --- MAIN CONTENT COMPONENT ---
function DebuggerContent() {
  // Wagmi Hooks
  const { address: walletAddress, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  
  // App State
  const [contractName, setContractName] = useState('My Contract');
  const [address, setAddress] = useState('');
  const [abiInput, setAbiInput] = useState('');
  const [parsedAbi, setParsedAbi] = useState<ABIFunction[]>([]);
  const [parsedAbiErrors, setParsedAbiErrors] = useState<ABIErrorDefinition[]>([]);
  const [abiError, setAbiError] = useState('');
  const [selectedFunc, setSelectedFunc] = useState<ABIFunction | null>(null);
  const [funcArgs, setFuncArgs] = useState<any[]>([]);
  const [touchedArgs, setTouchedArgs] = useState<boolean[]>([]);
  const [hasAttemptedExecute, setHasAttemptedExecute] = useState(false);
  const [payableValue, setPayableValue] = useState('');
  const [functionSearch, setFunctionSearch] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isMobileConsoleOpen, setIsMobileConsoleOpen] = useState(false);
  const [isMobileFunctionDrawerOpen, setIsMobileFunctionDrawerOpen] = useState(false);
  
  // Storage State
  const [activeContractId, setActiveContractId] = useState<string | null>(null);
  const [functionNotes, setFunctionNotes] = useState<Record<string, string>>({});
  const [activeSidebarTab, setActiveSidebarTab] = useState<'read' | 'write' | 'saved'>('read');
  const [savedContracts, setSavedContracts] = useState<SavedContract[]>([]);
  const [leftPanelWidth, setLeftPanelWidth] = useState(360);
  const [consolePanelWidth, setConsolePanelWidth] = useState(320);
  
  // Theme State
  const [currentThemeKey, setCurrentThemeKey] = useState<ThemeKey>('dark');
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const t = APP_THEMES[currentThemeKey].colors; 

  const startPanelResize = (panel: 'left' | 'console', startX: number) => {
    const startingWidth = panel === 'left' ? leftPanelWidth : consolePanelWidth;
    const minWidth = panel === 'left' ? 280 : 260;

    let finalWidth = startingWidth;
    const handlePointerMove = (event: PointerEvent) => {
      const delta = event.clientX - startX;
      const requestedWidth = startingWidth + (panel === 'left' ? delta : -delta);
      const maxWidth = Math.min(panel === 'left' ? 520 : 460, window.innerWidth * 0.42);
      const nextWidth = Math.round(Math.min(Math.max(requestedWidth, minWidth), maxWidth));
      finalWidth = nextWidth;
      if (panel === 'left') setLeftPanelWidth(nextWidth);
      else setConsolePanelWidth(nextWidth);
    };

    const stopResize = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      const nextLayout = panel === 'left' ? { left: finalWidth, console: consolePanelWidth } : { left: leftPanelWidth, console: finalWidth };
      localStorage.setItem('debugger_layout', JSON.stringify(nextLayout));
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize, { once: true });
  };

  const resizePanelWithKeyboard = (panel: 'left' | 'console', direction: -1 | 1) => {
    const step = 16 * direction;
    if (panel === 'left') setLeftPanelWidth(width => {
      const next = Math.min(520, Math.max(280, width + step));
      localStorage.setItem('debugger_layout', JSON.stringify({ left: next, console: consolePanelWidth }));
      return next;
    });
    else setConsolePanelWidth(width => {
      const next = Math.min(460, Math.max(260, width - step));
      localStorage.setItem('debugger_layout', JSON.stringify({ left: leftPanelWidth, console: next }));
      return next;
    });
  };

  // Init Data
  useEffect(() => {
    const stored = localStorage.getItem('debugger_contracts');
    if (stored) { try { setSavedContracts(JSON.parse(stored)); } catch (e) {} }
    
    const storedTheme = localStorage.getItem('debugger_theme') as ThemeKey;
    if (storedTheme && APP_THEMES[storedTheme]) { setCurrentThemeKey(storedTheme); }
    const storedSidebarTab = localStorage.getItem('debugger_sidebar_tab');
    if (storedSidebarTab === 'read' || storedSidebarTab === 'write' || storedSidebarTab === 'saved') setActiveSidebarTab(storedSidebarTab);
    const storedLayout = localStorage.getItem('debugger_layout');
    if (storedLayout) {
      try {
        const layout = JSON.parse(storedLayout);
        if (typeof layout.left === 'number') setLeftPanelWidth(Math.min(520, Math.max(280, layout.left)));
        if (typeof layout.console === 'number') setConsolePanelWidth(Math.min(460, Math.max(260, layout.console)));
      } catch {}
    }
  }, []);

  // --- ACTIONS ---

  const switchTheme = (key: ThemeKey) => {
    setCurrentThemeKey(key);
    localStorage.setItem('debugger_theme', key);
    setIsThemeMenuOpen(false);
  };

  const selectSidebarTab = (tab: 'read' | 'write' | 'saved') => {
    setActiveSidebarTab(tab);
    localStorage.setItem('debugger_sidebar_tab', tab);
  };

  const selectContractFunction = (func: ABIFunction) => {
    setSelectedFunc(func);
    setFuncArgs(new Array(func.inputs.length).fill(''));
    setTouchedArgs(new Array(func.inputs.length).fill(false));
    setHasAttemptedExecute(false);
    setPayableValue('');
    setExecutionResult(null);
    if (window.innerWidth < 768) setIsMobileFunctionDrawerOpen(true);
  };

  useEffect(() => {
    if (!isMobileFunctionDrawerOpen && !isMobileConsoleOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isMobileFunctionDrawerOpen, isMobileConsoleOpen]);

  const addLog = (type: LogEntry['type'], message: string, data?: any) => {
    setLogs(prev => [{ timestamp: new Date(), type, message, data }, ...prev]);
  };

  const saveContract = () => {
    if (!isAddress(address.trim(), { strict: false }) || abiError || parsedAbi.length === 0) { addLog('error', 'Enter a valid contract address and ABI'); return; }
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
    selectSidebarTab('saved');
  };

  const loadContract = (contract: SavedContract) => {
    setContractName(contract.name); setAddress(contract.address); setAbiInput(contract.abi); setFunctionNotes(contract.notes || {});
    setActiveContractId(contract.id); addLog('info', `Loaded: ${contract.name}`); selectSidebarTab('read'); setIsMobileFunctionDrawerOpen(false);
  };

  const deleteContract = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedContracts.filter(c => c.id !== id);
    setSavedContracts(updated); localStorage.setItem('debugger_contracts', JSON.stringify(updated));
    if (activeContractId === id) { setActiveContractId(null); setContractName('My Contract'); setAddress(''); setAbiInput(''); setFunctionNotes({}); }
  };

  useEffect(() => {
    if (!abiInput.trim()) { setParsedAbi([]); setParsedAbiErrors([]); setAbiError(''); return; }
    try {
      const parsed = JSON.parse(abiInput.trim());
      if (!Array.isArray(parsed)) throw new Error('ABI must be a JSON array');
      const functions = parsed.filter((item: any) => item.type === 'function');
      const errors = parsed.filter((item: any) => item.type === 'error');
      setParsedAbi(functions);
      setParsedAbiErrors(errors);
      setAbiError(functions.length ? '' : 'ABI contains no functions');
    } catch (error) {
      setParsedAbi([]);
      setParsedAbiErrors([]);
      setAbiError(error instanceof Error ? error.message : 'Invalid ABI JSON');
    }
  }, [abiInput]);

  const executeFunction = async () => {
    if (!selectedFunc || !publicClient) {
      if (!publicClient) addLog('error', 'Network client not ready');
      return;
    }
    const formattedArgs = funcArgs.map(arg => typeof arg === 'string' ? arg.trim() : arg);
    const parameterErrors = selectedFunc.inputs.map((input, index) => validateParamValue(input, formattedArgs[index])).filter(Boolean);
    if (parameterErrors.length) {
      setHasAttemptedExecute(true);
      addLog('error', 'Fix invalid function parameters', parameterErrors);
      setExecutionResult({ type: 'error', title: 'Invalid parameters', data: parameterErrors });
      return;
    }
    setIsLoading(true); addLog('info', `Calling ${selectedFunc.name}...`, formattedArgs);
    setExecutionResult({ type: 'info', title: 'Executing', data: 'Preparing contract call...' });
    
    try {
      const trimmedAddress = address.trim();
      if (!isAddress(trimmedAddress, { strict: false })) {
        throw new Error('Invalid contract address: expected a 20-byte hex address (0x + 40 hex characters)');
      }
      // Normalize pasted mixed-case addresses to their EIP-55 checksum form.
      const contractAddress = getAddress(trimmedAddress.toLowerCase());

      const callAbi = [selectedFunc, ...parsedAbiErrors];
      if (['view', 'pure'].includes(selectedFunc.stateMutability)) {
        // READ
        const result = await publicClient.readContract({
          address: contractAddress,
          abi: callAbi,
          functionName: selectedFunc.name,
          args: formattedArgs
        });
        const serializedResult = toSerializable(result);
        addLog('success', `Result (${selectedFunc.name})`, JSON.stringify(serializedResult, null, 2));
        setExecutionResult({ type: 'success', title: 'Result', data: serializedResult });
      } else {
        // WRITE
        if (!walletAddress) throw new Error("Connect Wallet");
        const savedChainId = activeContractId ? Number(savedContracts.find(contract => contract.id === activeContractId)?.networkId) : undefined;
        if (savedChainId && chainId !== savedChainId) throw new Error(`Wrong network: switch to chain ${savedChainId} before writing`);
        const value = selectedFunc.stateMutability === 'payable' && payableValue ? parseEther(payableValue) : undefined;
        addLog('info', 'Simulating transaction...');
        const simulation = await publicClient.simulateContract({
          address: contractAddress,
          abi: callAbi,
          functionName: selectedFunc.name,
          args: formattedArgs,
          account: walletAddress,
          value,
        });
        const estimatedGas = await publicClient.estimateContractGas(simulation.request);
        addLog('success', 'Simulation passed', { estimatedGas: estimatedGas.toString() });
        setExecutionResult({ type: 'info', title: 'Simulation passed', data: { estimatedGas: estimatedGas.toString(), status: 'Waiting for wallet confirmation' } });
        const hash = await writeContractAsync(simulation.request);
        addLog('info', 'Transaction sent', { hash });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        const receiptResult = { status: receipt.status, block: receipt.blockNumber.toString(), gasUsed: receipt.gasUsed.toString(), hash: receipt.transactionHash || hash };
        addLog('success', 'Confirmed', receiptResult);
        setExecutionResult({ type: 'success', title: 'Transaction confirmed', data: receiptResult });
      }
    } catch (err: any) {
      console.error(err);
      const decodedError = decodeContractError(err, parsedAbiErrors);
      if (decodedError) {
        addLog('error', `Reverted: ${decodedError.errorName}`, decodedError);
        setExecutionResult({ type: 'error', title: `Reverted: ${decodedError.errorName}`, data: decodedError });
      } else {
        const errorMessage = err.shortMessage || err.message;
        addLog('error', 'Failed', errorMessage);
        setExecutionResult({ type: 'error', title: 'Execution failed', data: errorMessage });
      }
    } finally { setIsLoading(false); }
  };

  const readFunctions = parsedAbi.filter(f => ['view', 'pure'].includes(f.stateMutability));
  const writeFunctions = parsedAbi.filter(f => !['view', 'pure'].includes(f.stateMutability));
  const activeFunctions = (activeSidebarTab === 'read' ? readFunctions : writeFunctions).filter(func => functionKey(func).toLowerCase().includes(functionSearch.toLowerCase()));
  const addressIsValid = isAddress(address.trim(), { strict: false });
  const selectedFunctionKey = selectedFunc ? functionKey(selectedFunc) : '';
  const selectedParameterErrors = selectedFunc ? selectedFunc.inputs.map((input, index) => validateParamValue(input, funcArgs[index])) : [];
  const selectedSavedContract = activeContractId ? savedContracts.find(contract => contract.id === activeContractId) : undefined;
  const savedChainId = selectedSavedContract?.networkId ? Number(selectedSavedContract.networkId) : undefined;
  const networkMismatch = Boolean(savedChainId && chainId && savedChainId !== chainId);
  const activeChain = SUPPORTED_CHAINS.find(chain => chain.id === chainId);
  const executionResultText = executionResult ? (typeof executionResult.data === 'string' ? executionResult.data : JSON.stringify(toSerializable(executionResult.data), null, 2)) : '';

  return (
    <RainbowKitProvider theme={APP_THEMES[currentThemeKey].rkTheme()}>
    <div className={`flex flex-col min-h-dvh md:h-screen min-w-[320px] font-sans overflow-y-auto md:overflow-hidden transition-colors duration-300 ${t.bgMain} ${t.textMain}`}>
      
      {/* HEADER */}
      <header className={`sticky top-0 md:static h-[72px] border-b ${t.border} ${t.bgHeader} backdrop-blur-xl flex items-center justify-between px-3 sm:px-4 lg:px-6 shrink-0 z-20 transition-colors duration-300`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/10">
            <Code2 size={21} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-base sm:text-lg tracking-tight leading-none">Contract<span className="text-blue-400">Debugger</span></h1>
            <div className={`hidden sm:flex items-center gap-1.5 mt-1.5 text-[10px] uppercase tracking-[0.16em] ${t.textDim}`}><CircleDot size={9} className="text-emerald-400" /> EVM workspace</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Theme Switcher */}
          <div className="relative">
            <button aria-label="Change color theme" onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)} className={`p-2.5 rounded-xl border ${t.border} ${t.bgCard} ${t.textDim} hover:text-blue-400 hover:border-blue-500/40 transition-colors`}>
              {currentThemeKey === 'dark' && <Moon size={18} />}
              {currentThemeKey === 'light' && <Sun size={18} />}
              {currentThemeKey === 'ocean' && <Palette size={18} />}
            </button>
            {isThemeMenuOpen && (
              <div className={`absolute top-full right-0 mt-2 w-36 ${t.bgHeader} backdrop-blur-xl border ${t.border} rounded-xl shadow-2xl overflow-hidden p-1 z-50`}>
                {(Object.keys(APP_THEMES) as ThemeKey[]).map(key => (
                  <button key={key} onClick={() => switchTheme(key)} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm ${t.textMain} ${t.bgHover} flex items-center gap-2 transition-colors`}>
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
          <button aria-label="Open console" onClick={() => setIsMobileConsoleOpen(true)} className={`lg:hidden relative p-2.5 rounded-xl border ${t.border} ${t.bgCard} ${t.textDim}`}><PanelBottom size={18}/>{logs.length > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-blue-500 text-[9px] text-white flex items-center justify-center">{logs.length}</span>}</button>
        </div>
      </header>

      {/* MAIN */}
      <main
        className="flex flex-col md:flex-row flex-none md:flex-1 overflow-visible md:overflow-hidden"
        style={{
          '--left-panel-width': `${leftPanelWidth}px`,
          '--console-panel-width': `${consolePanelWidth}px`,
        } as React.CSSProperties}
      >
        {/* LEFT SIDEBAR */}
        <aside className={`w-full md:w-[var(--left-panel-width)] h-auto border-b md:border-b-0 ${t.border} ${t.bgSidebar} flex flex-col shrink-0 z-0 transition-colors duration-300`}>
          <div className={`p-4 border-b ${t.border} space-y-3`}>
             <div className="flex items-center justify-between">
               <div className={`text-[10px] font-bold uppercase tracking-[0.16em] ${t.textDim}`}>Contract workspace</div>
               <div className={`text-[10px] font-mono ${t.textDim}`}>{parsedAbi.length} functions{parsedAbiErrors.length > 0 ? ` · ${parsedAbiErrors.length} errors` : ''}</div>
             </div>
             <div className="flex gap-2">
                <input type="text" value={contractName} onChange={(e) => setContractName(e.target.value)} placeholder="Contract Name" 
                  className={`min-w-0 flex-1 ${t.bgInput} border ${t.border} ${t.textMain} rounded-xl px-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60 outline-none transition-all`} />
                <button aria-label="Save contract" disabled={!addressIsValid || Boolean(abiError) || parsedAbi.length === 0} onClick={saveContract} className={`border p-2.5 rounded-xl transition-colors disabled:opacity-40 ${activeContractId ? t.accentSecondary : `${t.bgCard} ${t.border} ${t.textDim} hover:text-blue-400 hover:border-blue-500/40`}`}><Save size={17} /></button>
             </div>
            <input type="text" value={address} onChange={(e) => { setAddress(e.target.value); if(activeContractId) setActiveContractId(null); }} placeholder="0x... (Contract Address)" 
                className={`w-full ${t.bgInput} border ${address && !addressIsValid ? 'border-red-500/60' : t.border} ${t.textMain} rounded-xl px-3 py-2.5 text-xs font-mono focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60 outline-none transition-all`} />
            {address && <p className={`text-[10px] flex items-center gap-1 ${addressIsValid ? t.success : t.error}`}>{addressIsValid ? <CircleDot size={9}/> : <AlertTriangle size={10}/>} {addressIsValid ? 'Valid contract address' : 'Expected 0x + 40 hex characters'}</p>}
            <div className="relative group">
              <textarea value={abiInput} onChange={(e) => { setAbiInput(e.target.value); if(activeContractId) setActiveContractId(null); }} placeholder='Paste ABI JSON here...' 
                className={`w-full h-20 ${t.bgInput} border ${t.border} ${t.textMain} rounded-xl p-3 text-xs font-mono focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60 outline-none resize-none transition-all focus:h-36 placeholder:text-slate-600`} />
              <div className={`absolute bottom-2 right-2 text-[10px] ${t.textDim} ${t.bgInput} px-1 rounded pointer-events-none`}>ABI</div>
            </div>
            {abiError && <p className={`text-[10px] flex items-center gap-1 ${t.error}`}><AlertTriangle size={10}/>{abiError}</p>}
          </div>

          {activeSidebarTab !== 'saved' && (
            <div className={`p-2 border-b ${t.border}`}>
              <div className="relative">
                <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textDim}`} />
                <input value={functionSearch} onChange={(event) => setFunctionSearch(event.target.value)} placeholder="Search functions or signatures..." className={`w-full ${t.bgInput} border ${t.border} rounded-lg py-2 pl-8 pr-3 text-xs ${t.textMain} outline-none focus:border-blue-500/60`} />
              </div>
            </div>
          )}

          <div className={`grid grid-cols-3 gap-1 p-2 border-b ${t.border} ${t.bgSidebar}`}>
            {['read', 'write', 'saved'].map(tab => (
              <button key={tab} onClick={() => selectSidebarTab(tab as 'read' | 'write' | 'saved')}
                className={`py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors
                  ${activeSidebarTab === tab ? `${t.bgCard} ${t.textAccent} shadow-sm` : `${t.textDim} ${t.bgHover}`}`}>
                {tab === 'saved' ? <Bookmark size={12} /> : tab}
              </button>
            ))}
          </div>

          <div className="max-h-[42dvh] md:max-h-none md:flex-1 overflow-y-auto overscroll-contain">
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
                {activeFunctions.map((func) => (
                  <button key={functionKey(func)} onClick={() => selectContractFunction(func)}
                    className={`w-full text-left px-4 py-3.5 border-b border-l-2 ${t.border} ${t.bgHover} transition-colors flex items-center justify-between group ${selectedFunc === func ? `${t.bgActive}` : 'border-l-transparent'}`}>
                    <div className={`flex items-center gap-2 min-w-0 pr-2 font-mono text-sm ${t.textMain}`}>
                        <span className="truncate" title={functionKey(func)}>{functionKey(func)}</span> {functionNotes[functionKey(func)] && <StickyNote size={12} className="text-amber-500 shrink-0" />}
                    </div>
                    <ChevronRight size={14} className={`${t.textDim} opacity-0 group-hover:opacity-100`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div
          role="separator"
          aria-label="Resize contract panel"
          aria-orientation="vertical"
          aria-valuemin={280}
          aria-valuemax={520}
          aria-valuenow={leftPanelWidth}
          tabIndex={0}
          onPointerDown={(event) => startPanelResize('left', event.clientX)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') resizePanelWithKeyboard('left', -1);
            if (event.key === 'ArrowRight') resizePanelWithKeyboard('left', 1);
          }}
          className="hidden md:flex w-2 -mx-1 shrink-0 cursor-col-resize items-center justify-center group z-10 touch-none focus-visible:outline-none focus-visible:bg-blue-500/15"
        >
          <div className={`h-full w-px ${t.bgSidebar} border-l ${t.border} group-hover:border-blue-400 group-focus-visible:border-blue-400 transition-colors flex items-center justify-center`}>
            <GripVertical size={12} className="min-w-3 text-slate-600 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* EXECUTION PANEL */}
        {isMobileFunctionDrawerOpen && <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileFunctionDrawerOpen(false)} />}
        <section role={isMobileFunctionDrawerOpen ? 'dialog' : undefined} aria-modal={isMobileFunctionDrawerOpen ? true : undefined} aria-label={isMobileFunctionDrawerOpen ? 'Execute contract function' : undefined} id="execution-panel" className={`${isMobileFunctionDrawerOpen ? 'mobile-function-drawer z-[60] flex rounded-t-3xl border-t shadow-2xl' : 'hidden'} md:static md:z-auto md:flex md:h-auto md:rounded-none md:border-t-0 md:shadow-none flex-1 min-w-0 md:min-h-0 flex-col ${t.bgMain} ${t.border} relative overflow-hidden transition-colors duration-300 before:absolute before:inset-0 before:pointer-events-none before:bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.08),transparent_38%)]`}>
          {selectedFunc ? (
            <div className="flex flex-col h-full min-h-0">
              <div className={`md:hidden relative h-9 shrink-0 border-b ${t.border}`}><div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-500/40"/><button aria-label="Close function drawer" onClick={() => setIsMobileFunctionDrawerOpen(false)} className={`absolute top-1 right-3 p-1.5 rounded-lg ${t.bgCard} ${t.textDim}`}><X size={15}/></button></div>
              <div className={`relative p-5 lg:p-6 border-b ${t.border} ${t.bgHeader} backdrop-blur-xl`}>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="min-w-0">
                    <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] mb-2 ${t.textDim}`}>Contract function</p>
                    <h2 className={`text-xl font-semibold font-mono truncate ${t.textMain}`}>{selectedFunctionKey}</h2>
                    <p className={`text-xs mt-1.5 ${t.textDim}`}>{selectedFunc.inputs.length} input{selectedFunc.inputs.length === 1 ? '' : 's'} · {selectedFunc.outputs?.length || 0} output{selectedFunc.outputs?.length === 1 ? '' : 's'}</p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-2.5 py-1.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${selectedFunc.stateMutability === 'payable' ? t.badgePayable : ['view', 'pure'].includes(selectedFunc.stateMutability) ? t.badgeRead : t.badgeWrite}`}>
                    {selectedFunc.stateMutability}
                  </span>
                </div>
                {networkMismatch && <div className="mt-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-center justify-between gap-3"><span className="flex items-center gap-2"><AlertTriangle size={14}/>Saved on chain {savedChainId}, connected to {chainId}</span><button onClick={() => savedChainId && switchChainAsync({ chainId: savedChainId })} className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 font-medium">Switch network</button></div>}
                <div className="relative group mt-4">
                    <textarea value={functionNotes[selectedFunctionKey] || functionNotes[selectedFunc.name] || ''} onChange={(e) => {
                        const newNotes = { ...functionNotes, [selectedFunctionKey]: e.target.value }; setFunctionNotes(newNotes);
                        if (activeContractId) { const u = savedContracts.map(c => c.id === activeContractId ? { ...c, notes: newNotes } : c); setSavedContracts(u); localStorage.setItem('debugger_contracts', JSON.stringify(u)); }
                    }} placeholder="Add a note for this function..." className={`w-full ${t.bgInput} border ${t.border} rounded-xl py-2 px-3 text-xs ${t.textMain} outline-none resize-none h-9 focus:h-20 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-600`} />
                </div>
              </div>

              <div className="relative flex-1 min-h-0 overflow-y-auto p-4 md:p-6 lg:p-8">
                <div className="max-w-3xl mx-auto">
                  <div className="flex items-center justify-between mb-5">
                    <div><h3 className={`text-sm font-semibold ${t.textMain}`}>Call parameters</h3><p className={`text-xs mt-1 ${t.textDim}`}>Values are encoded according to the loaded ABI.</p></div>
                    <Braces size={18} className={t.textDim} />
                  </div>
                  {selectedFunc.inputs.map((input, idx) => (
                    <DynamicInput key={idx} type={input.type} name={input.name} value={funcArgs[idx]} components={input.components} colors={t} currentUserAddress={walletAddress} error={(touchedArgs[idx] || hasAttemptedExecute) ? selectedParameterErrors[idx] : null}
                      onBlur={() => setTouchedArgs(current => current.map((touched, index) => index === idx ? true : touched))}
                      onChange={(val) => { const newArgs = [...funcArgs]; newArgs[idx] = val; setFuncArgs(newArgs); setTouchedArgs(current => current.map((touched, index) => index === idx ? true : touched)); }} />
                  ))}
                  {selectedFunc.inputs.length === 0 && <div className={`${t.textDim} p-8 ${t.bgCard} rounded-2xl border ${t.border} flex flex-col items-center text-center gap-3`}><Box size={22}/><div><p className={`text-sm font-medium ${t.textMain}`}>No parameters required</p><p className="text-xs mt-1">This function can be executed directly.</p></div></div>}
                  {selectedFunc.stateMutability === 'payable' && <div className={`mt-5 p-4 border ${t.border} ${t.bgCard} rounded-2xl`}><label className={`text-xs font-medium ${t.textMain}`}>Native token value <span className={t.textDim}>({activeChain?.nativeCurrency.symbol || 'native'})</span></label><input value={payableValue} onChange={(event) => setPayableValue(event.target.value)} inputMode="decimal" placeholder="0.0" className={`mt-2 w-full ${t.bgInput} border ${t.border} rounded-xl px-3.5 py-2.5 font-mono text-sm ${t.textMain} outline-none focus:border-blue-500/60`} /><p className={`text-[10px] mt-1.5 ${t.textDim}`}>Sent as transaction value; leave empty for zero.</p></div>}
                  {executionResult && <div className={`md:hidden mt-5 rounded-2xl border overflow-hidden ${executionResult.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/5' : executionResult.type === 'error' ? 'border-red-500/30 bg-red-500/5' : 'border-blue-500/30 bg-blue-500/5'}`}><div className={`px-4 py-3 border-b flex items-center justify-between gap-3 ${executionResult.type === 'success' ? 'border-emerald-500/20' : executionResult.type === 'error' ? 'border-red-500/20' : 'border-blue-500/20'}`}><div className="flex items-center gap-2 min-w-0"><Terminal size={14} className={executionResult.type === 'success' ? 'text-emerald-400' : executionResult.type === 'error' ? 'text-red-400' : 'text-blue-400'}/><span className={`text-xs font-semibold truncate ${t.textMain}`}>{executionResult.title}</span></div>{executionResultText && <button onClick={() => navigator.clipboard.writeText(executionResultText)} className={`shrink-0 flex items-center gap-1 text-[10px] ${t.textDim} hover:text-blue-400`}><Copy size={11}/>Copy</button>}</div>{executionResultText && <pre className={`p-4 max-h-52 overflow-auto font-mono text-xs leading-relaxed whitespace-pre-wrap break-all ${t.textMain}`}>{executionResultText}</pre>}</div>}
                </div>
              </div>

              <div className={`relative p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:p-5 border-t ${t.border} ${t.bgHeader} backdrop-blur-xl shrink-0`}>
                <div className="max-w-3xl mx-auto flex items-center gap-4">
                  <button onClick={executeFunction} disabled={isLoading || networkMismatch || (!walletAddress && !['view', 'pure'].includes(selectedFunc.stateMutability))}
                    className={`flex-1 py-3 px-6 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-950/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
                      ${isLoading ? 'bg-slate-500 cursor-not-allowed' : t.accentPrimary}`}>
                    {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Play size={18} fill="currentColor" /> Run</>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`relative h-full flex flex-col items-center justify-center text-center p-8 ${t.textDim}`}>
              <div className={`w-16 h-16 rounded-2xl border ${t.border} ${t.bgCard} flex items-center justify-center mb-5 shadow-xl`}><Layers size={27} className="text-blue-400" /></div>
              <p className={`font-semibold ${t.textMain}`}>Choose a contract function</p><p className="text-sm mt-2 max-w-xs">Select a read or write method from the sidebar to inspect its parameters.</p>
            </div>
          )}
        </section>

        <div
          role="separator"
          aria-label="Resize console panel"
          aria-orientation="vertical"
          aria-valuemin={260}
          aria-valuemax={460}
          aria-valuenow={consolePanelWidth}
          tabIndex={0}
          onPointerDown={(event) => startPanelResize('console', event.clientX)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') resizePanelWithKeyboard('console', -1);
            if (event.key === 'ArrowRight') resizePanelWithKeyboard('console', 1);
          }}
          className="hidden lg:flex w-2 -mx-1 shrink-0 cursor-col-resize items-center justify-center group z-10 touch-none focus-visible:outline-none focus-visible:bg-blue-500/15"
        >
          <div className={`h-full w-px ${t.bgSidebar} border-l ${t.border} group-hover:border-blue-400 group-focus-visible:border-blue-400 transition-colors flex items-center justify-center`}>
            <GripVertical size={12} className="min-w-3 text-slate-600 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* CONSOLE */}
        <aside className={`hidden lg:flex lg:w-[var(--console-panel-width)] ${t.bgSidebar} flex-col shrink-0 transition-colors duration-300`}>
           <div className={`h-[53px] px-4 border-b ${t.border} flex items-center justify-between ${t.bgHeader}`}>
            <div className={`flex items-center gap-2 ${t.textMain} text-sm font-semibold`}><Terminal size={15} className="text-blue-400" /> Console <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${t.bgCard} ${t.textDim}`}>{logs.length}</span></div>
            <button onClick={() => setLogs([])} className={`text-[11px] ${t.textDim} hover:text-red-400 transition-colors`}>Clear</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
            {logs.map((log, idx) => (
              <div key={idx} className={`border ${t.border} ${t.bgCard} rounded-xl p-3`}>
                <div className={`flex items-center gap-2 mb-1 ${t.textDim}`}>
                  <span>[{log.timestamp.toLocaleTimeString()}]</span>
                  <span className={log.type === 'success' ? t.success : log.type === 'error' ? t.error : t.info}>{log.type.toUpperCase()}</span>
                </div>
                <div className={`${t.textMain} break-words`}>{log.message}</div>
                {log.data && <pre className={`${t.bgInput} p-2 rounded mt-2 overflow-x-auto ${t.textDim} border ${t.border}`}>{typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}</pre>}
                {log.data?.hash && <div className="flex gap-2 mt-2"><button onClick={() => navigator.clipboard.writeText(log.data.hash)} className={`flex items-center gap-1 text-[10px] ${t.textAccent}`}><Copy size={11}/>Copy hash</button>{activeChain?.blockExplorers?.default.url && <a href={`${activeChain.blockExplorers.default.url}/tx/${log.data.hash}`} target="_blank" rel="noreferrer" className={`flex items-center gap-1 text-[10px] ${t.textAccent}`}><ExternalLink size={11}/>Explorer</a>}</div>}
              </div>
            ))}
            {logs.length === 0 && <div className={`text-center py-10 ${t.textDim}`}><Terminal size={20} className="mx-auto mb-2 opacity-50"/><p>No activity yet</p></div>}
          </div>
        </aside>
      </main>
      {isMobileConsoleOpen && <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end" onClick={() => setIsMobileConsoleOpen(false)}><section className={`w-full h-[65vh] rounded-t-2xl border-t ${t.border} ${t.bgSidebar} flex flex-col`} onClick={(event) => event.stopPropagation()}><header className={`p-4 border-b ${t.border} flex items-center justify-between`}><div className="flex items-center gap-2 font-semibold"><Terminal size={16} className="text-blue-400"/>Console <span className={`text-xs ${t.textDim}`}>{logs.length}</span></div><button aria-label="Close console" onClick={() => setIsMobileConsoleOpen(false)} className={`p-2 rounded-lg ${t.bgCard}`}><X size={16}/></button></header><div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">{logs.map((log, idx) => <div key={idx} className={`border ${t.border} ${t.bgCard} rounded-xl p-3`}><div className={`flex gap-2 mb-1 ${t.textDim}`}><span>{log.timestamp.toLocaleTimeString()}</span><span className={log.type === 'success' ? t.success : log.type === 'error' ? t.error : t.info}>{log.type.toUpperCase()}</span></div><div className={t.textMain}>{log.message}</div>{log.data && <pre className={`mt-2 p-2 rounded overflow-x-auto ${t.bgInput} ${t.textDim}`}>{typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}</pre>}</div>)}</div></section></div>}
    </div>
    </RainbowKitProvider>
  );
}

// --- ROOT WRAPPER ---
export default function ContractDebuggerPage() {
  const [wagmiConfig, setWagmiConfig] = useState<ReturnType<typeof getDefaultConfig> | null>(null);
  const [projectIdReady, setProjectIdReady] = useState(true);

  useEffect(() => {
    const initialization = window.setTimeout(() => {
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
    });

    return () => window.clearTimeout(initialization);
  }, []);

  // 仅在客户端初始化 wagmi，避免构建/预渲染阶段触发 indexedDB
  if (!wagmiConfig) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-200">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4"><div className="absolute inset-0 rounded-xl bg-blue-500/15 animate-pulse"/><Activity className="absolute inset-0 m-auto text-blue-400" size={22}/></div>
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
