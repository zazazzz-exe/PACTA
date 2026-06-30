#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env,
};

// ---------- TTL constants (≈ ledger cadence) ----------
const DAY_IN_LEDGERS: u32 = 17_280;
const BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const LIFETIME_THRESHOLD: u32 = BUMP_AMOUNT - DAY_IN_LEDGERS;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotFound = 2,
    Unauthorized = 3,
    InvalidState = 4,
    InvalidAmount = 5,
    InvalidMilestones = 6,
    BondAlreadyPosted = 7,
    CapitalAlreadyDeposited = 8,
    NoMilestonesLeft = 9,
    DeadlineNotReached = 10,
    MilestonesIncomplete = 11,
}

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Status {
    Pending = 0,
    Active = 1,
    Completed = 2,
    Refunded = 3,
    Cancelled = 4,
}

#[contracttype]
#[derive(Clone)]
pub struct Agreement {
    pub id: u64,
    pub investor: Address,
    pub trader: Address,
    pub token: Address,
    pub capital: i128,
    pub bond: i128,
    pub milestones: u32,
    pub released_milestones: u32,
    pub released_amount: i128,
    pub profit_share_bps: u32,
    pub created_at: u64,
    pub start_time: u64,
    pub deadline: u64,
    pub status: Status,
    pub bond_posted: bool,
    pub capital_deposited: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct Reputation {
    pub completed: u32,
    pub refunded: u32,
    pub total_volume: i128,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Counter,
    Agreement(u64),
    Reputation(Address),
}

#[contract]
pub struct PactaEscrow;

#[contractimpl]
impl PactaEscrow {
    /// Runs once at deploy. `admin` is reserved for future dispute resolution.
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Counter, &0u64);
    }

    pub fn create_agreement(
        env: Env,
        investor: Address,
        trader: Address,
        token: Address,
        capital: i128,
        bond: i128,
        milestones: u32,
        profit_share_bps: u32,
        duration: u64,
    ) -> Result<u64, Error> {
        investor.require_auth();
        if capital <= 0 || bond < 0 {
            return Err(Error::InvalidAmount);
        }
        if milestones == 0 {
            return Err(Error::InvalidMilestones);
        }
        if profit_share_bps > 10_000 {
            return Err(Error::InvalidAmount);
        }

        let mut counter: u64 = env.storage().instance().get(&DataKey::Counter).unwrap_or(0);
        counter += 1;

        let now = env.ledger().timestamp();
        let agreement = Agreement {
            id: counter,
            investor: investor.clone(),
            trader: trader.clone(),
            token,
            capital,
            bond,
            milestones,
            released_milestones: 0,
            released_amount: 0,
            profit_share_bps,
            created_at: now,
            start_time: 0,
            deadline: now + duration, // provisional; recomputed at activation
            status: Status::Pending,
            bond_posted: false,
            capital_deposited: false,
        };

        Self::save(&env, &agreement);
        env.storage().instance().set(&DataKey::Counter, &counter);

        env.events().publish(
            (symbol_short!("created"), counter),
            (investor, trader, capital, bond),
        );
        Ok(counter)
    }

    pub fn post_bond(env: Env, agreement_id: u64) -> Result<(), Error> {
        let mut a = Self::load(&env, agreement_id)?;
        a.trader.require_auth();
        if a.status != Status::Pending {
            return Err(Error::InvalidState);
        }
        if a.bond_posted {
            return Err(Error::BondAlreadyPosted);
        }
        if a.bond > 0 {
            token::Client::new(&env, &a.token).transfer(
                &a.trader,
                &env.current_contract_address(),
                &a.bond,
            );
        }
        a.bond_posted = true;
        Self::maybe_activate(&env, &mut a);
        Self::save(&env, &a);
        env.events()
            .publish((symbol_short!("bonded"), agreement_id), a.bond);
        Ok(())
    }

    pub fn deposit_capital(env: Env, agreement_id: u64) -> Result<(), Error> {
        let mut a = Self::load(&env, agreement_id)?;
        a.investor.require_auth();
        if a.status != Status::Pending {
            return Err(Error::InvalidState);
        }
        if a.capital_deposited {
            return Err(Error::CapitalAlreadyDeposited);
        }
        token::Client::new(&env, &a.token).transfer(
            &a.investor,
            &env.current_contract_address(),
            &a.capital,
        );
        a.capital_deposited = true;
        Self::maybe_activate(&env, &mut a);
        Self::save(&env, &a);
        env.events()
            .publish((symbol_short!("deposited"), agreement_id), a.capital);
        Ok(())
    }

    pub fn release_milestone(env: Env, agreement_id: u64) -> Result<i128, Error> {
        let mut a = Self::load(&env, agreement_id)?;
        a.investor.require_auth();
        if a.status != Status::Active {
            return Err(Error::InvalidState);
        }
        if a.released_milestones >= a.milestones {
            return Err(Error::NoMilestonesLeft);
        }

        a.released_milestones += 1;
        // Last milestone sweeps the remainder so rounding never strands dust.
        let tranche = if a.released_milestones == a.milestones {
            a.capital - a.released_amount
        } else {
            a.capital / (a.milestones as i128)
        };
        a.released_amount += tranche;

        token::Client::new(&env, &a.token).transfer(
            &env.current_contract_address(),
            &a.trader,
            &tranche,
        );

        Self::save(&env, &a);
        env.events().publish(
            (symbol_short!("released"), agreement_id),
            (a.released_milestones, tranche),
        );
        Ok(tranche)
    }

    pub fn complete(env: Env, agreement_id: u64) -> Result<(), Error> {
        let mut a = Self::load(&env, agreement_id)?;
        a.investor.require_auth();
        if a.status != Status::Active {
            return Err(Error::InvalidState);
        }
        if a.released_milestones < a.milestones {
            return Err(Error::MilestonesIncomplete);
        }
        if a.bond > 0 {
            token::Client::new(&env, &a.token).transfer(
                &env.current_contract_address(),
                &a.trader,
                &a.bond,
            );
        }
        a.status = Status::Completed;
        Self::save(&env, &a);
        Self::bump_reputation(&env, &a.trader, true, a.capital);
        env.events()
            .publish((symbol_short!("completed"), agreement_id), a.trader.clone());
        Ok(())
    }

    pub fn emergency_refund(env: Env, agreement_id: u64) -> Result<(), Error> {
        let mut a = Self::load(&env, agreement_id)?;
        a.investor.require_auth();
        if a.status != Status::Active {
            return Err(Error::InvalidState);
        }
        if env.ledger().timestamp() < a.deadline {
            return Err(Error::DeadlineNotReached);
        }
        let unreleased = a.capital - a.released_amount;
        let payout = unreleased + a.bond; // reclaim unreleased capital + seize bond
        if payout > 0 {
            token::Client::new(&env, &a.token).transfer(
                &env.current_contract_address(),
                &a.investor,
                &payout,
            );
        }
        a.status = Status::Refunded;
        Self::save(&env, &a);
        Self::bump_reputation(&env, &a.trader, false, a.capital);
        env.events().publish(
            (symbol_short!("refunded"), agreement_id),
            (a.investor.clone(), payout),
        );
        Ok(())
    }

    pub fn cancel(env: Env, agreement_id: u64) -> Result<(), Error> {
        let mut a = Self::load(&env, agreement_id)?;
        a.investor.require_auth();
        if a.status != Status::Pending {
            return Err(Error::InvalidState);
        }
        let client = token::Client::new(&env, &a.token);
        if a.capital_deposited {
            client.transfer(&env.current_contract_address(), &a.investor, &a.capital);
        }
        if a.bond_posted && a.bond > 0 {
            client.transfer(&env.current_contract_address(), &a.trader, &a.bond);
        }
        a.status = Status::Cancelled;
        Self::save(&env, &a);
        env.events()
            .publish((symbol_short!("cancelled"), agreement_id), a.investor.clone());
        Ok(())
    }

    // ----------------- views -----------------
    pub fn get_agreement(env: Env, agreement_id: u64) -> Result<Agreement, Error> {
        Self::load(&env, agreement_id)
    }

    pub fn get_reputation(env: Env, trader: Address) -> Reputation {
        env.storage()
            .persistent()
            .get(&DataKey::Reputation(trader))
            .unwrap_or(Reputation {
                completed: 0,
                refunded: 0,
                total_volume: 0,
            })
    }

    pub fn get_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::Counter).unwrap_or(0)
    }

    // ----------------- internal -----------------
    fn load(env: &Env, id: u64) -> Result<Agreement, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Agreement(id))
            .ok_or(Error::NotFound)
    }

    fn save(env: &Env, a: &Agreement) {
        let key = DataKey::Agreement(a.id);
        env.storage().persistent().set(&key, a);
        env.storage()
            .persistent()
            .extend_ttl(&key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
    }

    fn maybe_activate(env: &Env, a: &mut Agreement) {
        if a.bond_posted && a.capital_deposited && a.status == Status::Pending {
            let now = env.ledger().timestamp();
            let duration = a.deadline - a.created_at; // recover original duration
            a.start_time = now;
            a.deadline = now + duration;
            a.status = Status::Active;
            env.events().publish((symbol_short!("active"), a.id), now);
        }
    }

    fn bump_reputation(env: &Env, trader: &Address, completed: bool, volume: i128) {
        let key = DataKey::Reputation(trader.clone());
        let mut rep: Reputation =
            env.storage()
                .persistent()
                .get(&key)
                .unwrap_or(Reputation {
                    completed: 0,
                    refunded: 0,
                    total_volume: 0,
                });
        if completed {
            rep.completed += 1;
        } else {
            rep.refunded += 1;
        }
        rep.total_volume += volume;
        env.storage().persistent().set(&key, &rep);
        env.storage()
            .persistent()
            .extend_ttl(&key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
    }
}

mod test;
