use anchor_lang::prelude::*;
use crate::state::*;

/// 初始化用户账户的账户结构
#[derive(Accounts)]
pub struct InitUser<'info> {
    /// 用户账户
    /// 创建新的用户账户
    #[account(
        init,                                   // 初始化新账户
        payer = user,                          // 用户支付创建费用
        space = UserAccount::BASE_LEN,         // 基础账户空间大小
        seeds = [UserAccount::SEED, user.key().as_ref()], // PDA种子包含用户地址
        bump                                   // 自动计算bump值
    )]
    pub user_account: Account<'info, UserAccount>,
    
    /// 用户钱包账户
    /// 需要签名，支付创建费用
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// 系统程序
    /// 用于创建账户
    pub system_program: Program<'info, System>,
}

/// 初始化用户账户处理函数
pub fn handler(ctx: Context<InitUser>) -> Result<()> {
    let user_account = &mut ctx.accounts.user_account;
    
    // 初始化用户账户
    user_account.user = ctx.accounts.user.key();
    user_account.numbers = Vec::new();
    user_account.nonce = 0;
    user_account.bump = ctx.bumps.user_account;
    
    msg!("初始化用户账户: {}", ctx.accounts.user.key());
    
    Ok(())
}