//设置服务费比例（仅管理员）
use anchor_lang::prelude::*;
use crate::errors::LotteryError;
use crate::state::Config;

#[derive(Accounts)]
pub struct SetFeeRate<'info> {
    #[account(mut, has_one = admin)]
    pub config: Account<'info, Config>,

    #[account(signer)]
    pub admin: AccountInfo<'info>,
}

pub fn handle(ctx: Context<SetFeeRate>, rate: u8) -> Result<()> {
    require!(rate <= 100, LotteryError::InvalidBetAmount); // 费率不得超过100%
    let config = &mut ctx.accounts.config;
    config.fee_rate = rate;
    Ok(())
}