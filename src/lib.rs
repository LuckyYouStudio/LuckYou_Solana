// lib.rs
use anchor_lang::prelude::*;

mod errors;

mod state;

mod instructions {
    pub mod set_fee_rate;
    pub mod withdraw_fees;
    pub mod place_bet;

    pub use set_fee_rate::*;
    pub use withdraw_fees::*;
    pub use place_bet::*;
}

use instructions::*;

declare_id!("H3nY6p687WVyxTtjumFaFFm8qqnLL6LGR72TBCHDLaL3");

#[program]
pub mod lottery {
    use super::*;

    // 初始化彩票系统，仅用于测试
    pub fn initialize(ctx: Context<Initialize>, fee_rate: u8) -> Result<()> {
        // 初始化Config
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.fee_rate = fee_rate;
        config.vault = ctx.accounts.vault.key();
        config.bump = *ctx.bumps.get("config").unwrap();

        // 初始化Vault
        let vault = &mut ctx.accounts.vault;
        vault.amount = 0;
        vault.bump = *ctx.bumps.get("vault").unwrap();

        // 初始化首个轮次
        let round = &mut ctx.accounts.round;
        round.round = 1;
        round.random_result = None;
        round.total_bet = 0;
        round.created_at = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn set_fee_rate(ctx: Context<SetFeeRate>, rate: u8) -> Result<()> {
        instructions::set_fee_rate::handle(ctx, rate)
    }

    pub fn withdraw_fees(ctx: Context<WithdrawFees>) -> Result<()> {
        instructions::withdraw_fees::handle(ctx)
    }

    pub fn place_bet(ctx: Context<PlaceBet>, chosen_number: u16, amount: u64) -> Result<()> {
        instructions::place_bet::handle(ctx, chosen_number, amount)
    }

    // pub fn set_random_result(ctx: Context<SetRandomResult>, result: u8) -> Result<()> {
    //     instructions::set_random_result::handle(ctx, result)
    // }

    // pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
    //     instructions::claim_reward::handle(ctx)
    // }
}

// 初始化账户结构
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 1 + 32 + 1, // Config::LEN
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, state::Config>,

    #[account(
        init,
        payer = admin,
        space = 8 + 8 + 1, // Vault::LEN
        seeds = [b"vault", config.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, state::Vault>,

    #[account(
        init,
        payer = admin,
        space = 8 + 8 + 3 + 8 + 8, // Round::LEN
        seeds = [b"round", &[1u8; 8]], // 轮次1
        bump
    )]
    pub round: Account<'info, state::Round>,

    #[account(mut, signer)]
    pub admin: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

// 其他模块文件稍后可继续生成：
// - src/state.rs：定义 Config, Bet, Vault 等账户
// - src/instructions/*.rs：按功能分指令
// - src/errors.rs：定义错误类型
