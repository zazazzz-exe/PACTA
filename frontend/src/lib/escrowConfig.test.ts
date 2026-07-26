import { describe, it, expect } from 'vitest';
import { TESTNET, MAINNET } from './networks';
import { escrowConfigFor } from './escrowConfig';

const mainnetEnv = {
  VITE_MAINNET_PACTS_ENABLED: 'true',
  VITE_MAINNET_ESCROW_CONTRACT_ID: 'CDMAINNETCONTRACTID',
  VITE_MAINNET_SETTLEMENT_SAC: 'CDUSDCSAC',
  VITE_MAINNET_READ_SOURCE: 'GMAINNETREADSOURCE',
};

describe('escrowConfigFor', () => {
  it('returns the known testnet escrow values', () => {
    const cfg = escrowConfigFor(TESTNET, {});
    expect(cfg).not.toBeNull();
    expect(cfg!.contractId).toBe('CAY6BQEORTLX5F2PDPQAUTQGJ46JUN3JP7U22Q2U3DLVFNOVNXIDCTBM');
    expect(cfg!.passphrase).toBe('Test SDF Network ; September 2015');
    expect(cfg!.rpcUrl).toBe('https://soroban-testnet.stellar.org');
    expect(cfg!.settlementSac).toBe('CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC');
  });
  it('returns null for a mainnet network whose Pacts are not enabled/configured', () => {
    // MAINNET.supportsPacts is false by default (no env in the test build).
    expect(escrowConfigFor(MAINNET, {})).toBeNull();
  });
  it('returns env-sourced mainnet values when supportsPacts and env are set', () => {
    const enabledMainnet = { ...MAINNET, supportsPacts: true };
    const cfg = escrowConfigFor(enabledMainnet, mainnetEnv);
    expect(cfg).not.toBeNull();
    expect(cfg!.contractId).toBe('CDMAINNETCONTRACTID');
    expect(cfg!.settlementSac).toBe('CDUSDCSAC');
    expect(cfg!.passphrase).toBe('Public Global Stellar Network ; September 2015');
    expect(cfg!.readSource).toBe('GMAINNETREADSOURCE');
  });
  it('returns null on mainnet when supportsPacts is true but a required env value is missing', () => {
    const enabledMainnet = { ...MAINNET, supportsPacts: true };
    expect(escrowConfigFor(enabledMainnet, { ...mainnetEnv, VITE_MAINNET_ESCROW_CONTRACT_ID: '' })).toBeNull();
    expect(escrowConfigFor(enabledMainnet, { ...mainnetEnv, VITE_MAINNET_SETTLEMENT_SAC: '' })).toBeNull();
    // A read source is required: without it, reads made while disconnected would
    // simulate against an empty account and fail.
    expect(escrowConfigFor(enabledMainnet, { ...mainnetEnv, VITE_MAINNET_READ_SOURCE: '' })).toBeNull();
  });
});
