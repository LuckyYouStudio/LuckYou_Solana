// 用户投注操作
use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;
use crate::errors::LotteryError;
use crate::state::{Config, Round, Bet, Vault};

/**
 * @notice 投注交易的账户结构
 */
#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub round: Account<'info, Round>,

    #[account(
        init,
        payer = user,
        space = Bet::LEN,
        seeds = [
            b"bet",
            user.key().as_ref(),
            &round.round.to_le_bytes(),
        ],
        bump
    )]
    pub bet: Account<'info, Bet>,

    #[account(mut)]
    pub vault: Account<'info, Vault>,

    #[account(mut, signer)]
    pub user: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

/**
 * @notice 处理用户投注操作
 * @param ctx 交易上下文
 * @param chosen_number 用户选择的三位数字(000-999)
 * @param amount 投注金额(lamports)
 * @return 处理结果
 */
pub fn handle(ctx: Context<PlaceBet>, chosen_number: u16, amount: u64) -> Result<()> {
    // 验证投注金额是否有效
    require!(amount > 0, LotteryError::InvalidBetAmount);
    
    // 验证选择的数字是否有效 (000-999)
    require!(chosen_number <= 999, LotteryError::InvalidNumber);

    // 获取账户引用
    let round = &mut ctx.accounts.round;
    let bet = &mut ctx.accounts.bet;
    let config = &ctx.accounts.config;
    let vault = &mut ctx.accounts.vault;
    let user = &ctx.accounts.user;

    // 计算服务费
    let fee_amount = amount * config.fee_rate as u64 / 100;
    let bet_amount = amount - fee_amount;

    // 更新轮次信息
    round.total_bet = round.total_bet.checked_add(bet_amount).unwrap();

    // 记录投注信息
    bet.user = *user.key;
    bet.round = round.round;
    bet.chosen_number = chosen_number; // 使用u16存储三位数字
    bet.amount = bet_amount;
    bet.claimed = false;

    // 更新金库信息
    vault.amount = vault.amount.checked_add(fee_amount).unwrap();

    // 创建转账指令
    let ix = system_instruction::transfer(
        user.key,
        ctx.accounts.config.to_account_info().key,
        amount,
    );

    // 执行转账
    anchor_lang::solana_program::program::invoke(
        &ix,
        &[
            user.to_account_info(),
            ctx.accounts.config.to_account_info(),
        ],
    )?;

    Ok(())
}