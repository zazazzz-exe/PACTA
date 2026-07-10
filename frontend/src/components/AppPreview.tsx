import { Plus } from 'lucide-react';
import { ProofPanel } from './ProofPanel';
import { StatusPill } from './StatusPill';
import { MilestoneBar } from './MilestoneBar';
import { Avatar } from './Avatar';
import { Status } from '../lib/contract';
import { CONTRACT_ID, contractExplorerUrl } from '../lib/config';
import { shortAddr } from '../lib/format';

const DEMO_TRADER = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

function PreviewDashboard() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-ink">Your agreements</p>
        <span className="grid h-7 w-7 place-items-center rounded-control bg-accent text-white">
          <Plus size={14} aria-hidden />
        </span>
      </div>
      <div className="rounded-card border border-hairline bg-paper p-3 shadow-card">
        <div className="flex items-center gap-2">
          <Avatar addr={DEMO_TRADER} />
          <div className="min-w-0 flex-1">
            <p className="text-[9px] text-fog">Provider</p>
            <p className="mono truncate text-[11px] text-ink">{shortAddr(DEMO_TRADER, 4, 4)}</p>
          </div>
          <StatusPill status={Status.Active} />
        </div>
        <div className="mt-2.5 flex items-baseline gap-1.5">
          <span className="mono text-[16px] font-medium text-ink">75</span>
          <span className="text-[10px] text-slate">XLM protected</span>
        </div>
        <div className="mt-2.5">
          <MilestoneBar released={1} total={4} releasedAmount={187500000n} />
        </div>
        <p className="mono mt-2 text-[9px] text-fog">agr-001</p>
      </div>
    </div>
  );
}

function PreviewAgreement() {
  return (
    <div className="space-y-3">
      <p className="mono text-[11px] text-slate">agr-001</p>
      <ProofPanel
        id="agr-001"
        protectedAmount="75.0000000"
        txHash="9f3a…b1c4"
        contractShort={shortAddr(CONTRACT_ID, 6, 6)}
        explorerUrl={contractExplorerUrl()}
        countUp
      />
    </div>
  );
}

function PreviewCreate() {
  return (
    <div className="space-y-3">
      <p className="text-[13px] font-medium text-ink">New agreement</p>
      <div className="space-y-2">
        <div className="rounded-control bg-mist px-3 py-2">
          <p className="text-[9px] text-fog">Capital</p>
          <p className="mono text-[12px] text-ink">100 XLM</p>
        </div>
        <div className="rounded-control bg-mist px-3 py-2">
          <p className="text-[9px] text-fog">Security bond</p>
          <p className="mono text-[12px] text-ink">20 XLM</p>
        </div>
        <div className="rounded-control bg-mist px-3 py-2">
          <p className="text-[9px] text-fog">Milestones</p>
          <p className="mono text-[12px] text-ink">4</p>
        </div>
      </div>
      <div className="h-9 rounded-control bg-accent" />
    </div>
  );
}

export function AppPreview() {
  return (
    <div className="preview-stack min-h-[380px]">
      <div className="preview-screen preview-screen-1">
        <PreviewDashboard />
      </div>
      <div className="preview-screen preview-screen-2">
        <PreviewAgreement />
      </div>
      <div className="preview-screen preview-screen-3">
        <PreviewCreate />
      </div>
    </div>
  );
}
