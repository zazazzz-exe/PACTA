#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, token, Address, Env};

fn setup_token<'a>(env: &Env, admin: &Address) -> (Address, token::StellarAssetClient<'a>) {
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let addr = sac.address();
    let admin_client = token::StellarAssetClient::new(env, &addr);
    (addr, admin_client)
}

fn deploy_pacta(env: &Env, admin: &Address) -> Address {
    env.register(PactaEscrow, (admin.clone(),))
}

#[test]
fn final_release_auto_completes_and_returns_bond() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let investor = Address::generate(&env);
    let trader = Address::generate(&env);

    let (token_addr, token_admin) = setup_token(&env, &admin);
    let token_client = token::Client::new(&env, &token_addr);

    let capital: i128 = 1_000;
    let bond: i128 = 200;
    token_admin.mint(&investor, &capital);
    token_admin.mint(&trader, &bond);

    let pacta = deploy_pacta(&env, &admin);
    let client = PactaEscrowClient::new(&env, &pacta);

    let id = client.create_agreement(
        &investor, &trader, &token_addr, &capital, &bond, &2u32, &1_000u32, &3600u64,
    );
    client.post_bond(&id);
    client.deposit_capital(&id);

    // First release: not final, still Active, no bond yet.
    client.release_milestone(&id);
    let a = client.get_agreement(&id);
    assert_eq!(a.status, Status::Active);
    assert_eq!(token_client.balance(&trader), 500);

    // Final release: remaining capital + bond returned, status Completed.
    client.release_milestone(&id);
    let a = client.get_agreement(&id);
    assert_eq!(a.status, Status::Completed);
    assert_eq!(token_client.balance(&trader), capital + bond);
    assert_eq!(token_client.balance(&pacta), 0);

    let rep = client.get_reputation(&trader);
    assert_eq!(rep.completed, 1);
    assert_eq!(rep.refunded, 0);
    assert_eq!(rep.total_volume, capital);
}

#[test]
fn complete_is_idempotent_after_auto_complete() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let investor = Address::generate(&env);
    let trader = Address::generate(&env);

    let (token_addr, token_admin) = setup_token(&env, &admin);
    let token_client = token::Client::new(&env, &token_addr);

    let capital: i128 = 1_000;
    let bond: i128 = 200;
    token_admin.mint(&investor, &capital);
    token_admin.mint(&trader, &bond);

    let pacta = deploy_pacta(&env, &admin);
    let client = PactaEscrowClient::new(&env, &pacta);

    let id = client.create_agreement(
        &investor, &trader, &token_addr, &capital, &bond, &1u32, &1_000u32, &3600u64,
    );
    client.post_bond(&id);
    client.deposit_capital(&id);
    client.release_milestone(&id); // single milestone -> auto-completes

    // complete() on an already-Completed agreement is a harmless no-op.
    client.complete(&id);
    assert_eq!(token_client.balance(&trader), capital + bond);
    assert_eq!(token_client.balance(&pacta), 0);
    let rep = client.get_reputation(&trader);
    assert_eq!(rep.completed, 1); // not double-counted
}

#[test]
fn emergency_refund_cannot_seize_bond_after_full_release() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let investor = Address::generate(&env);
    let trader = Address::generate(&env);

    let (token_addr, token_admin) = setup_token(&env, &admin);
    let token_client = token::Client::new(&env, &token_addr);

    let capital: i128 = 1_000;
    let bond: i128 = 200;
    token_admin.mint(&investor, &capital);
    token_admin.mint(&trader, &bond);

    let pacta = deploy_pacta(&env, &admin);
    let client = PactaEscrowClient::new(&env, &pacta);

    // duration 0 => deadline reached immediately, but all milestones get released.
    let id = client.create_agreement(
        &investor, &trader, &token_addr, &capital, &bond, &2u32, &1_000u32, &0u64,
    );
    client.post_bond(&id);
    client.deposit_capital(&id);
    client.release_milestone(&id);
    client.release_milestone(&id); // auto-completes

    // The investor tries to seize the bond after the deadline. It must fail.
    assert_eq!(
        client.try_emergency_refund(&id),
        Err(Ok(Error::InvalidState))
    );
    assert_eq!(token_client.balance(&trader), capital + bond); // trader keeps bond
    assert_eq!(token_client.balance(&investor), 0);
}

#[test]
fn emergency_refund_returns_unreleased_plus_bond() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let investor = Address::generate(&env);
    let trader = Address::generate(&env);

    let (token_addr, token_admin) = setup_token(&env, &admin);
    let token_client = token::Client::new(&env, &token_addr);

    let capital: i128 = 1_000;
    let bond: i128 = 200;
    token_admin.mint(&investor, &capital);
    token_admin.mint(&trader, &bond);

    let pacta = deploy_pacta(&env, &admin);
    let client = PactaEscrowClient::new(&env, &pacta);

    // duration 0 => deadline == activation time => refund allowed immediately
    let id = client.create_agreement(
        &investor, &trader, &token_addr, &capital, &bond, &4u32, &1_000u32, &0u64,
    );
    client.post_bond(&id);
    client.deposit_capital(&id);

    // release 1 of 4 milestones (250), trader has 250
    let tranche = client.release_milestone(&id);
    assert_eq!(tranche, 250);
    assert_eq!(token_client.balance(&trader), 250);

    // trader "disappears" -> investor refunds: unreleased (750) + bond (200) = 950
    client.emergency_refund(&id);
    assert_eq!(token_client.balance(&investor), 950);
    assert_eq!(token_client.balance(&pacta), 0);

    let a = client.get_agreement(&id);
    assert_eq!(a.status, Status::Refunded);

    let rep = client.get_reputation(&trader);
    assert_eq!(rep.refunded, 1);
    assert_eq!(rep.completed, 0);
}

#[test]
fn trader_reclaims_bond_when_investor_never_funds() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let investor = Address::generate(&env);
    let trader = Address::generate(&env);

    let (token_addr, token_admin) = setup_token(&env, &admin);
    let token_client = token::Client::new(&env, &token_addr);

    let capital: i128 = 1_000;
    let bond: i128 = 200;
    token_admin.mint(&trader, &bond);

    let pacta = deploy_pacta(&env, &admin);
    let client = PactaEscrowClient::new(&env, &pacta);

    let id = client.create_agreement(
        &investor, &trader, &token_addr, &capital, &bond, &2u32, &0u32, &3600u64,
    );
    client.post_bond(&id); // trader bonds; investor never deposits.
    assert_eq!(client.get_agreement(&id).status, Status::Pending);

    client.reclaim_bond(&id);
    assert_eq!(token_client.balance(&trader), bond); // bond back
    assert_eq!(token_client.balance(&pacta), 0);
    assert_eq!(client.get_agreement(&id).status, Status::Cancelled);
}

#[test]
fn reclaim_bond_rejected_once_active() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let investor = Address::generate(&env);
    let trader = Address::generate(&env);

    let (token_addr, token_admin) = setup_token(&env, &admin);

    let capital: i128 = 1_000;
    let bond: i128 = 200;
    token_admin.mint(&investor, &capital);
    token_admin.mint(&trader, &bond);

    let pacta = deploy_pacta(&env, &admin);
    let client = PactaEscrowClient::new(&env, &pacta);

    let id = client.create_agreement(
        &investor, &trader, &token_addr, &capital, &bond, &2u32, &0u32, &3600u64,
    );
    client.post_bond(&id);
    client.deposit_capital(&id); // both in -> Active
    // Once Active, the bond is committed; reclaim is rejected.
    assert_eq!(client.try_reclaim_bond(&id), Err(Ok(Error::InvalidState)));
}

#[test]
fn reclaim_bond_rejected_without_bond() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let investor = Address::generate(&env);
    let trader = Address::generate(&env);

    let (token_addr, _token_admin) = setup_token(&env, &admin);

    let pacta = deploy_pacta(&env, &admin);
    let client = PactaEscrowClient::new(&env, &pacta);

    let id = client.create_agreement(
        &investor, &trader, &token_addr, &1_000i128, &200i128, &2u32, &0u32, &3600u64,
    );
    // No bond posted yet -> nothing to reclaim.
    assert_eq!(client.try_reclaim_bond(&id), Err(Ok(Error::InvalidState)));
}

#[test]
fn cancel_while_pending_refunds_deposits() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let investor = Address::generate(&env);
    let trader = Address::generate(&env);

    let (token_addr, token_admin) = setup_token(&env, &admin);
    let token_client = token::Client::new(&env, &token_addr);

    let capital: i128 = 1_000;
    let bond: i128 = 200;
    token_admin.mint(&investor, &capital);
    token_admin.mint(&trader, &bond);

    let pacta = deploy_pacta(&env, &admin);
    let client = PactaEscrowClient::new(&env, &pacta);

    let id = client.create_agreement(
        &investor, &trader, &token_addr, &capital, &bond, &2u32, &0u32, &3600u64,
    );
    client.deposit_capital(&id); // only investor deposits, still Pending
    client.cancel(&id);

    assert_eq!(token_client.balance(&investor), capital);
    let a = client.get_agreement(&id);
    assert_eq!(a.status, Status::Cancelled);
}
