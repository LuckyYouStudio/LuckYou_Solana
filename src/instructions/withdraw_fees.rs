// 提取累计的服务费（仅管理员）

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke_signed, system_instruction};
use crate::errors::LotteryError;
use crate::state::{Config, Vault};

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(mut, has_one = admin)]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub vault: Account<'info, Vault>,

    #[account(mut, signer)]
    pub admin: AccountInfo<'info>,

    #[account(mut)]
    pub recipient: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<WithdrawFees>) -> Result<()> {
    let amount = ctx.accounts.vault.amount;
    let vault_bump = ctx.accounts.vault.bump;
    let vault_key = ctx.accounts.vault.key();
    let recipient_key = ctx.accounts.recipient.key();

    ctx.accounts.vault.amount = 0;

    // let config_key = ctx.accounts.config.key();
    // let seeds = &[b"vault".as_ref(), config_key.as_ref(), &[vault_bump]];
    // let signer = &[&seeds[..]];

    let signer: &[&[&[u8]]] = &[];

    let ix = system_instruction::transfer(&vault_key, &recipient_key, amount);

    invoke_signed(
        &ix,
        &[
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.recipient.to_account_info(),
        ],
        signer,
    )?;

    Ok(())
}
