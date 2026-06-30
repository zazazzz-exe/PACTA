import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CBLSIW2L5BV2KOM73EGXPZBO7DCVVW5TF2ROMYJZSZUTMSMGIFFEL3HL",
  }
} as const

export const Errors = {
  1: {message:"AlreadyInitialized"},
  2: {message:"NotFound"},
  3: {message:"Unauthorized"},
  4: {message:"InvalidState"},
  5: {message:"InvalidAmount"},
  6: {message:"InvalidMilestones"},
  7: {message:"BondAlreadyPosted"},
  8: {message:"CapitalAlreadyDeposited"},
  9: {message:"NoMilestonesLeft"},
  10: {message:"DeadlineNotReached"},
  11: {message:"MilestonesIncomplete"}
}

export enum Status {
  Pending = 0,
  Active = 1,
  Completed = 2,
  Refunded = 3,
  Cancelled = 4,
}

export type DataKey = {tag: "Admin", values: void} | {tag: "Counter", values: void} | {tag: "Agreement", values: readonly [u64]} | {tag: "Reputation", values: readonly [string]};


export interface Agreement {
  bond: i128;
  bond_posted: boolean;
  capital: i128;
  capital_deposited: boolean;
  created_at: u64;
  deadline: u64;
  id: u64;
  investor: string;
  milestones: u32;
  profit_share_bps: u32;
  released_amount: i128;
  released_milestones: u32;
  start_time: u64;
  status: Status;
  token: string;
  trader: string;
}


export interface Reputation {
  completed: u32;
  refunded: u32;
  total_volume: i128;
}

export interface Client {
  /**
   * Construct and simulate a cancel transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  cancel: ({agreement_id}: {agreement_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a complete transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  complete: ({agreement_id}: {agreement_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_count: (options?: MethodOptions) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a post_bond transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  post_bond: ({agreement_id}: {agreement_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_agreement transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_agreement: ({agreement_id}: {agreement_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Agreement>>>

  /**
   * Construct and simulate a get_reputation transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_reputation: ({trader}: {trader: string}, options?: MethodOptions) => Promise<AssembledTransaction<Reputation>>

  /**
   * Construct and simulate a deposit_capital transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  deposit_capital: ({agreement_id}: {agreement_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a create_agreement transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_agreement: ({investor, trader, token, capital, bond, milestones, profit_share_bps, duration}: {investor: string, trader: string, token: string, capital: i128, bond: i128, milestones: u32, profit_share_bps: u32, duration: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u64>>>

  /**
   * Construct and simulate a emergency_refund transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  emergency_refund: ({agreement_id}: {agreement_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a release_milestone transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  release_milestone: ({agreement_id}: {agreement_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin}: {admin: string},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({admin}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAACwAAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAAABAAAAAAAAAAhOb3RGb3VuZAAAAAIAAAAAAAAADFVuYXV0aG9yaXplZAAAAAMAAAAAAAAADEludmFsaWRTdGF0ZQAAAAQAAAAAAAAADUludmFsaWRBbW91bnQAAAAAAAAFAAAAAAAAABFJbnZhbGlkTWlsZXN0b25lcwAAAAAAAAYAAAAAAAAAEUJvbmRBbHJlYWR5UG9zdGVkAAAAAAAABwAAAAAAAAAXQ2FwaXRhbEFscmVhZHlEZXBvc2l0ZWQAAAAACAAAAAAAAAAQTm9NaWxlc3RvbmVzTGVmdAAAAAkAAAAAAAAAEkRlYWRsaW5lTm90UmVhY2hlZAAAAAAACgAAAAAAAAAUTWlsZXN0b25lc0luY29tcGxldGUAAAAL",
        "AAAAAwAAAAAAAAAAAAAABlN0YXR1cwAAAAAABQAAAAAAAAAHUGVuZGluZwAAAAAAAAAAAAAAAAZBY3RpdmUAAAAAAAEAAAAAAAAACUNvbXBsZXRlZAAAAAAAAAIAAAAAAAAACFJlZnVuZGVkAAAAAwAAAAAAAAAJQ2FuY2VsbGVkAAAAAAAABA==",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABAAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAHQ291bnRlcgAAAAABAAAAAAAAAAlBZ3JlZW1lbnQAAAAAAAABAAAABgAAAAEAAAAAAAAAClJlcHV0YXRpb24AAAAAAAEAAAAT",
        "AAAAAQAAAAAAAAAAAAAACUFncmVlbWVudAAAAAAAABAAAAAAAAAABGJvbmQAAAALAAAAAAAAAAtib25kX3Bvc3RlZAAAAAABAAAAAAAAAAdjYXBpdGFsAAAAAAsAAAAAAAAAEWNhcGl0YWxfZGVwb3NpdGVkAAAAAAAAAQAAAAAAAAAKY3JlYXRlZF9hdAAAAAAABgAAAAAAAAAIZGVhZGxpbmUAAAAGAAAAAAAAAAJpZAAAAAAABgAAAAAAAAAIaW52ZXN0b3IAAAATAAAAAAAAAAptaWxlc3RvbmVzAAAAAAAEAAAAAAAAABBwcm9maXRfc2hhcmVfYnBzAAAABAAAAAAAAAAPcmVsZWFzZWRfYW1vdW50AAAAAAsAAAAAAAAAE3JlbGVhc2VkX21pbGVzdG9uZXMAAAAABAAAAAAAAAAKc3RhcnRfdGltZQAAAAAABgAAAAAAAAAGc3RhdHVzAAAAAAfQAAAABlN0YXR1cwAAAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAAAAAABnRyYWRlcgAAAAAAEw==",
        "AAAAAQAAAAAAAAAAAAAAClJlcHV0YXRpb24AAAAAAAMAAAAAAAAACWNvbXBsZXRlZAAAAAAAAAQAAAAAAAAACHJlZnVuZGVkAAAABAAAAAAAAAAMdG90YWxfdm9sdW1lAAAACw==",
        "AAAAAAAAAAAAAAAGY2FuY2VsAAAAAAABAAAAAAAAAAxhZ3JlZW1lbnRfaWQAAAAGAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAIY29tcGxldGUAAAABAAAAAAAAAAxhZ3JlZW1lbnRfaWQAAAAGAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAJZ2V0X2NvdW50AAAAAAAAAAAAAAEAAAAG",
        "AAAAAAAAAAAAAAAJcG9zdF9ib25kAAAAAAAAAQAAAAAAAAAMYWdyZWVtZW50X2lkAAAABgAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAEdSdW5zIG9uY2UgYXQgZGVwbG95LiBgYWRtaW5gIGlzIHJlc2VydmVkIGZvciBmdXR1cmUgZGlzcHV0ZSByZXNvbHV0aW9uLgAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAANZ2V0X2FncmVlbWVudAAAAAAAAAEAAAAAAAAADGFncmVlbWVudF9pZAAAAAYAAAABAAAD6QAAB9AAAAAJQWdyZWVtZW50AAAAAAAAAw==",
        "AAAAAAAAAAAAAAAOZ2V0X3JlcHV0YXRpb24AAAAAAAEAAAAAAAAABnRyYWRlcgAAAAAAEwAAAAEAAAfQAAAAClJlcHV0YXRpb24AAA==",
        "AAAAAAAAAAAAAAAPZGVwb3NpdF9jYXBpdGFsAAAAAAEAAAAAAAAADGFncmVlbWVudF9pZAAAAAYAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAAAAAAAQY3JlYXRlX2FncmVlbWVudAAAAAgAAAAAAAAACGludmVzdG9yAAAAEwAAAAAAAAAGdHJhZGVyAAAAAAATAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAAAAAAB2NhcGl0YWwAAAAACwAAAAAAAAAEYm9uZAAAAAsAAAAAAAAACm1pbGVzdG9uZXMAAAAAAAQAAAAAAAAAEHByb2ZpdF9zaGFyZV9icHMAAAAEAAAAAAAAAAhkdXJhdGlvbgAAAAYAAAABAAAD6QAAAAYAAAAD",
        "AAAAAAAAAAAAAAAQZW1lcmdlbmN5X3JlZnVuZAAAAAEAAAAAAAAADGFncmVlbWVudF9pZAAAAAYAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAAAAAAARcmVsZWFzZV9taWxlc3RvbmUAAAAAAAABAAAAAAAAAAxhZ3JlZW1lbnRfaWQAAAAGAAAAAQAAA+kAAAALAAAAAw==" ]),
      options
    )
  }
  public readonly fromJSON = {
    cancel: this.txFromJSON<Result<void>>,
        complete: this.txFromJSON<Result<void>>,
        get_count: this.txFromJSON<u64>,
        post_bond: this.txFromJSON<Result<void>>,
        get_agreement: this.txFromJSON<Result<Agreement>>,
        get_reputation: this.txFromJSON<Reputation>,
        deposit_capital: this.txFromJSON<Result<void>>,
        create_agreement: this.txFromJSON<Result<u64>>,
        emergency_refund: this.txFromJSON<Result<void>>,
        release_milestone: this.txFromJSON<Result<i128>>
  }
}