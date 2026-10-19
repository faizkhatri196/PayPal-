import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, ColDef, RowSelectedEvent, GridReadyEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import {
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  Eye,
  FileCheck,
  X,
  Globe,
  Sliders,
} from 'lucide-react';

// Register AG Grid Community modules
ModuleRegistry.registerModules([AllCommunityModule]);

export interface TransactionRecord {
  id: string;
  contract_id: string;
  milestone_id?: string;
  title: string;
  provider: string;
  data_source?: 'Simulated Demo' | 'Live PayPal Sandbox';
  is_simulated?: boolean;
  amount: string;
  currency: string;
  payment_state: 'Authorized' | 'Captured' | 'Held' | 'Voided' | 'Pending Review';
  verification: 'Passed' | 'Rejected' | 'Pending' | 'Vetoed';
  risk: 'Low' | 'Medium' | 'High' | 'Review Required';
  ai_assessment: string;
  reconciliation: 'Confirmed' | 'Pending Sync' | 'Reconciled' | 'Desynced';
  updated_at: string;
  details: {
    paypal_order_id?: string;
    paypal_auth_id?: string;
    paypal_capture_id?: string;
    buyer_agent_id: string;
    worker_agent_id: string;
    deliverable_hash?: string;
    receipt_id?: string;
    verification_trace?: any;
    audit_events_count: number;
    requires_human_approval: boolean;
  };
}

interface Props {
  onSelectReceipt?: (receiptId: string) => void;
  onOpenContract?: (contractId: string) => void;
}

export function TransactionExplorer({ onSelectReceipt, onOpenContract }: Props) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [envFilter, setEnvFilter] = useState<'ALL' | 'SANDBOX' | 'DEMO'>('ALL');
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const gridRef = useRef<AgGridReact>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/transactions');
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load transactions`);
      const data = await res.json();
      setTransactions(data.transactions || []);
      if (!selectedTransaction && data.transactions && data.transactions.length > 0) {
        setSelectedTransaction(data.transactions[0]);
      }
    } catch (err: any) {
      console.error('Failed to fetch transactions:', err);
      setError(err.message || 'Unable to connect to transaction service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered rows for AG Grid
  const filteredData = useMemo(() => {
    return transactions.filter((t) => {
      const isSimulated = t.is_simulated || t.provider?.includes('Simulated') || t.id.startsWith('tx_demo_');

      let matchesEnv = true;
      if (envFilter === 'SANDBOX') matchesEnv = !isSimulated;
      else if (envFilter === 'DEMO') matchesEnv = isSimulated;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'CAPTURED' && t.payment_state === 'Captured') ||
        (statusFilter === 'AUTHORIZED' && (t.payment_state === 'Authorized' || t.payment_state === 'Held')) ||
        (statusFilter === 'REVIEW' && (t.risk === 'Review Required' || t.payment_state === 'Pending Review')) ||
        (statusFilter === 'VETOED' && (t.verification === 'Vetoed' || t.payment_state === 'Voided'));

      const matchesSearch =
        searchTerm === '' ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.details.paypal_order_id && t.details.paypal_order_id.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesEnv && matchesStatus && matchesSearch;
    });
  }, [transactions, statusFilter, envFilter, searchTerm]);

  // AG Grid Column Definitions
  const columnDefs = useMemo<ColDef<TransactionRecord>[]>(() => [
    {
      field: 'id',
      headerName: 'Transaction ID',
      width: 170,
      pinned: 'left',
      cellRenderer: (params: any) => {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '100%' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0284c7' }}>
              {params.value}
            </span>
          </div>
        );
      },
    },
    {
      field: 'title',
      headerName: 'Payment Purpose / Milestone',
      minWidth: 220,
      flex: 1,
      cellRenderer: (params: any) => (
        <span style={{ fontWeight: 600, color: '#0f172a' }}>{params.value}</span>
      ),
    },
    {
      field: 'provider',
      headerName: 'Environment & Source',
      width: 180,
      cellRenderer: (params: any) => {
        const isSimulated = params.data?.is_simulated || params.value?.includes('Simulated') || params.data?.id.startsWith('tx_demo_');
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              background: isSimulated ? 'rgba(217, 119, 6, 0.08)' : 'rgba(2, 132, 199, 0.08)',
              color: isSimulated ? '#b45309' : '#0369a1',
              border: `1px solid ${isSimulated ? 'rgba(217, 119, 6, 0.25)' : 'rgba(2, 132, 199, 0.25)'}`,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isSimulated ? '#d97706' : '#0284c7',
              }}
            />
            {isSimulated ? 'Demo — Simulated' : 'PayPal Sandbox'}
          </span>
        );
      },
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 130,
      type: 'rightAligned',
      cellRenderer: (params: any) => (
        <div style={{ textAlign: 'right', width: '100%' }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: params.data?.payment_state === 'Captured' ? '#059669' : '#0f172a' }}>
            {params.data?.currency} {parseFloat(params.value || '0').toFixed(2)}
          </span>
        </div>
      ),
    },
    {
      field: 'payment_state',
      headerName: 'Payment State',
      width: 135,
      cellRenderer: (params: any) => {
        const state = params.value;
        let color = '#475569';
        let bg = 'rgba(71, 85, 105, 0.08)';
        let border = 'rgba(71, 85, 105, 0.2)';

        if (state === 'Captured') {
          color = '#059669';
          bg = 'rgba(5, 150, 105, 0.1)';
          border = 'rgba(5, 150, 105, 0.25)';
        } else if (state === 'Authorized' || state === 'Held') {
          color = '#0284c7';
          bg = 'rgba(2, 132, 199, 0.1)';
          border = 'rgba(2, 132, 199, 0.25)';
        } else if (state === 'Voided') {
          color = '#dc2626';
          bg = 'rgba(220, 38, 38, 0.1)';
          border = 'rgba(220, 38, 38, 0.25)';
        } else if (state === 'Pending Review') {
          color = '#d97706';
          bg = 'rgba(217, 119, 6, 0.1)';
          border = 'rgba(217, 119, 6, 0.25)';
        }

        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              color,
              background: bg,
              border: `1px solid ${border}`,
            }}
          >
            {state}
          </span>
        );
      },
    },
    {
      field: 'verification',
      headerName: 'Deterministic Gate',
      width: 145,
      cellRenderer: (params: any) => {
        const v = params.value;
        const isPass = v === 'Passed';
        const isVeto = v === 'Vetoed';
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              color: isPass ? '#059669' : isVeto ? '#dc2626' : '#d97706',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {isPass ? <CheckCircle2 size={13} /> : isVeto ? <ShieldAlert size={13} /> : <Clock size={13} />}
            {v}
          </span>
        );
      },
    },
    {
      field: 'ai_assessment',
      headerName: 'AI Security Assessment',
      minWidth: 220,
      flex: 1,
      cellRenderer: (params: any) => (
        <span style={{ fontSize: '12px', color: '#475569' }}>
          {params.value || 'Deterministic verification active'}
        </span>
      ),
    },
    {
      field: 'reconciliation',
      headerName: 'Reconciliation',
      width: 130,
      cellRenderer: (params: any) => (
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{params.value}</span>
      ),
    },
    {
      field: 'updated_at',
      headerName: 'Timestamp',
      width: 160,
      cellRenderer: (params: any) => {
        try {
          const d = new Date(params.value);
          return (
            <span style={{ fontSize: '11.5px', color: '#64748b', fontFamily: 'monospace' }}>
              {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          );
        } catch {
          return <span>{params.value}</span>;
        }
      },
    },
    {
      headerName: 'Inspect',
      width: 95,
      pinned: 'right',
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => {
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (params.data) {
                setSelectedTransaction(params.data);
                setIsDrawerOpen(true);
                if (onOpenContract && params.data.contract_id) {
                  onOpenContract(params.data.contract_id);
                }
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#0284c7',
              marginTop: '4px',
            }}
          >
            <Eye size={12} /> Inspect
          </button>
        );
      },
    },
  ], [onOpenContract]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  const onRowSelected = (event: RowSelectedEvent<TransactionRecord>) => {
    if (event.node.isSelected() && event.data) {
      setSelectedTransaction(event.data);
      // Propagate row selection to update the active contract in the parent Payment Decision Panel
      if (onOpenContract && event.data.contract_id) {
        onOpenContract(event.data.contract_id);
      }
    }
  };

  const onRowDoubleClicked = (event: any) => {
    if (event.data) {
      setSelectedTransaction(event.data);
      setIsDrawerOpen(true);
      if (onOpenContract && event.data.contract_id) {
        onOpenContract(event.data.contract_id);
      }
    }
  };

  const onGridReady = (params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* Top Controls Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: '#ffffff',
          padding: '12px 18px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }}
            />
            <input
              type="text"
              placeholder="Search ID, purpose, order..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 32px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#0f172a',
                fontSize: '12.5px',
              }}
            />
          </div>

          {/* Environment Filter */}
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '2px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            {(['ALL', 'SANDBOX', 'DEMO'] as const).map((env) => (
              <button
                key={env}
                onClick={() => setEnvFilter(env)}
                style={{
                  padding: '4px 9px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: envFilter === env ? '#ffffff' : 'transparent',
                  color: envFilter === env ? '#0284c7' : '#64748b',
                  boxShadow: envFilter === env ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {env === 'ALL' ? 'All Sources' : env === 'SANDBOX' ? 'PayPal Sandbox' : 'Demo'}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={13} style={{ color: '#64748b', marginRight: '2px' }} />
            {(['ALL', 'CAPTURED', 'AUTHORIZED', 'REVIEW', 'VETOED'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: statusFilter === filter ? '1px solid #0284c7' : '1px solid #e2e8f0',
                  background: statusFilter === filter ? 'rgba(2, 132, 199, 0.08)' : '#ffffff',
                  color: statusFilter === filter ? '#0284c7' : '#475569',
                }}
              >
                {filter === 'ALL'
                  ? 'All States'
                  : filter === 'CAPTURED'
                  ? 'Captured'
                  : filter === 'AUTHORIZED'
                  ? 'Active Holds'
                  : filter === 'REVIEW'
                  ? 'Review'
                  : 'Vetoed'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {selectedTransaction && (
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="action-btn secondary"
              style={{ padding: '5px 10px', fontSize: '12px' }}
            >
              <Eye size={12} /> Inspect {selectedTransaction.id}
            </button>
          )}

          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Showing {filteredData.length} of {transactions.length}
          </span>
          <button
            onClick={fetchTransactions}
            disabled={loading}
            className="action-btn secondary"
            style={{ padding: '5px 10px', fontSize: '12px' }}
          >
            <RefreshCw size={12} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Full-Width AG Grid Container (Complements layout rather than squeezing) */}
      <div
        className="ag-theme-quartz"
        style={{
          height: '520px',
          width: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        }}
      >
        {error ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              background: '#ffffff',
              color: '#dc2626',
              gap: '8px',
            }}
          >
            <AlertTriangle size={24} />
            <p style={{ fontSize: '13px' }}>{error}</p>
            <button
              onClick={fetchTransactions}
              className="action-btn secondary"
              style={{ marginTop: '8px' }}
            >
              Retry
            </button>
          </div>
        ) : (
          <AgGridReact<TransactionRecord>
            ref={gridRef}
            rowData={filteredData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowSelection="single"
            onRowSelected={onRowSelected}
            onRowDoubleClicked={onRowDoubleClicked}
            onGridReady={onGridReady}
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 20, 50]}
            animateRows={true}
            loading={loading}
            rowHeight={42}
            headerHeight={38}
          />
        )}
      </div>

      {/* Contextual Inspector Slide-Over Drawer */}
      {isDrawerOpen && selectedTransaction && (
        <div className="contextual-drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="contextual-drawer" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '10.5px', color: '#0284c7', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Transaction Inspector
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '2px', fontFamily: 'monospace' }}>
                  {selectedTransaction.id}
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  {selectedTransaction.title}
                </p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#475569',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Close Inspector"
              >
                <X size={16} />
              </button>
            </div>

            {/* Amount and Payment State Box */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
                padding: '12px 16px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Amount</span>
                <p style={{ fontSize: '20px', fontWeight: 800, color: selectedTransaction.payment_state === 'Captured' ? '#059669' : '#0f172a', fontFamily: 'monospace', marginTop: '1px' }}>
                  {selectedTransaction.currency} {parseFloat(selectedTransaction.amount).toFixed(2)}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Payment State</span>
                <p style={{ fontSize: '13px', fontWeight: 700, color: selectedTransaction.payment_state === 'Captured' ? '#059669' : selectedTransaction.payment_state === 'Voided' ? '#dc2626' : '#0284c7', marginTop: '2px' }}>
                  {selectedTransaction.payment_state}
                </p>
              </div>
            </div>

            {/* Environment Badge & Honesty Note */}
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                background: (selectedTransaction.is_simulated || selectedTransaction.provider?.includes('Simulated')) ? 'rgba(217, 119, 6, 0.08)' : 'rgba(2, 132, 199, 0.08)',
                border: `1px solid ${(selectedTransaction.is_simulated || selectedTransaction.provider?.includes('Simulated')) ? 'rgba(217, 119, 6, 0.25)' : 'rgba(2, 132, 199, 0.25)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600, color: (selectedTransaction.is_simulated || selectedTransaction.provider?.includes('Simulated')) ? '#b45309' : '#0369a1' }}>
                {(selectedTransaction.is_simulated || selectedTransaction.provider?.includes('Simulated')) ? 'Demo — Simulated Record' : 'Live PayPal Sandbox Record'}
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {(selectedTransaction.is_simulated || selectedTransaction.provider?.includes('Simulated')) ? 'Zero live funds moved' : 'Live pre-authorization'}
              </span>
            </div>

            {/* Provider Identifiers with 1-Click Copy */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                PayPal Provider References
              </span>

              {selectedTransaction.details.paypal_order_id && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '5px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ color: '#64748b' }}>Order ID:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: 600 }}>
                      {selectedTransaction.details.paypal_order_id}
                    </span>
                    <button
                      onClick={() => handleCopy(selectedTransaction.details.paypal_order_id!, 'order')}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                      title="Copy Order ID"
                    >
                      {copiedId === 'order' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              )}

              {selectedTransaction.details.paypal_auth_id && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '5px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ color: '#64748b' }}>Pre-Auth Hold ID:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontFamily: 'monospace', color: '#0284c7', fontWeight: 600 }}>
                      {selectedTransaction.details.paypal_auth_id}
                    </span>
                    <button
                      onClick={() => handleCopy(selectedTransaction.details.paypal_auth_id!, 'auth')}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                      title="Copy Authorization ID"
                    >
                      {copiedId === 'auth' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              )}

              {selectedTransaction.details.paypal_capture_id && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '5px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ color: '#64748b' }}>Capture ID:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontFamily: 'monospace', color: '#059669', fontWeight: 600 }}>
                      {selectedTransaction.details.paypal_capture_id}
                    </span>
                    <button
                      onClick={() => handleCopy(selectedTransaction.details.paypal_capture_id!, 'capture')}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                      title="Copy Capture ID"
                    >
                      {copiedId === 'capture' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f8fafc',
                  padding: '8px 12px',
                  borderRadius: '5px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                }}
              >
                <span style={{ color: '#64748b' }}>Buyer Agent:</span>
                <span style={{ fontFamily: 'monospace', color: '#334155', fontWeight: 600 }}>
                  {selectedTransaction.details.buyer_agent_id}
                </span>
              </div>
            </div>

            {/* Verification & Risk Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Multi-Gate Verification Results
              </span>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '12px',
                  lineHeight: '1.5',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Deterministic Invariant Gate:</span>
                  <span
                    style={{
                      color: selectedTransaction.verification === 'Passed' ? '#059669' : '#d97706',
                      fontWeight: 700,
                    }}
                  >
                    {selectedTransaction.verification}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>AI Security Evaluation:</span>
                  <span style={{ color: selectedTransaction.verification === 'Vetoed' ? '#dc2626' : '#059669', fontWeight: 600 }}>
                    {selectedTransaction.ai_assessment}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Ledger Reconciliation:</span>
                  <span style={{ color: '#0284c7', fontWeight: 600 }}>
                    {selectedTransaction.reconciliation}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto', paddingTop: '16px' }}>
              {selectedTransaction.details.receipt_id && onSelectReceipt && (
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onSelectReceipt(selectedTransaction.details.receipt_id!);
                  }}
                  className="action-btn primary"
                  style={{ fontSize: '12.5px', padding: '8px 14px' }}
                >
                  <FileCheck size={14} />
                  View Cryptographic Receipt in Vault
                </button>
              )}

              {onOpenContract && (
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onOpenContract(selectedTransaction.contract_id);
                  }}
                  className="action-btn secondary"
                  style={{ fontSize: '12.5px', padding: '8px 14px' }}
                >
                  <Eye size={14} />
                  Focus Contract in Decision Panel
                </button>
              )}

              <button
                onClick={() => setIsDrawerOpen(false)}
                className="action-btn secondary"
                style={{ fontSize: '12.5px', padding: '8px 14px' }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
