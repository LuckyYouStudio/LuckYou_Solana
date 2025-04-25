// lib.rs
use anchor_lang::prelude::*;

mod errors;

mod state;

mod instructions {
    //pub mod set_fee_rate;
    //pub mod withdraw_fees;

    //pub use set_fee_rate::*;
    //pub use withdraw_fees::*;
}

//use instructions::*;

declare_id!("H3nY6p687WVyxTtjumFaFFm8qqnLL6LGR72TBCHDLaL3");

#[program]
pub mod lottery {
    use super::*;

    // pub fn set_fee_rate(ctx: Context<SetFeeRate>, rate: u8) -> Result<()> {
    //     instructions::set_fee_rate::handle(ctx, rate)
    // }

    // pub fn withdraw_fees(ctx: Context<WithdrawFees>) -> Result<()> {
    //     instructions::withdraw_fees::handle(ctx)
    // }

    // pub fn place_bet(ctx: Context<PlaceBet>, chosen_number: u8) -> Result<()> {
    //     instructions::place_bet::handle(ctx, chosen_number)
    // }

    // pub fn set_random_result(ctx: Context<SetRandomResult>, result: u8) -> Result<()> {
    //     instructions::set_random_result::handle(ctx, result)
    // }

    // pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
    //     instructions::claim_reward::handle(ctx)
    // }
}

// 其他模块文件稍后可继续生成：
// - src/state.rs：定义 Config, Bet, Vault 等账户
// - src/instructions/*.rs：按功能分指令
// - src/errors.rs：定义错误类型
