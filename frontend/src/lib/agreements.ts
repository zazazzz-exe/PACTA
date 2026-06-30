import { getAllAgreements, type Agreement } from './contract';

// Wrapper around the existing on-chain read path (spec §4). MVP enumerates the
// contract; production would query an indexer and filter by trader in the DB.
export async function fetchAllAgreements(): Promise<Agreement[]> {
  return getAllAgreements();
}
