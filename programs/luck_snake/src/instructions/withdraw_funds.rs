use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::errors::LuckSnakeError;

/// 提取资金指令的账户结构
/// 定义提取资金所需的所有账户
#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    /// 程序配置账户
    /// 验证管理员和财库地址
    #[account(
        seeds = [LuckSnakeConfig::SEED],        // 使用PDA种子验证
        bump,                                    // 验证bump值
        has_one = authority,                    // 验证管理员地址匹配
        has_one = treasury                      // 验证财库地址匹配
    )]
    pub config: Account<'info, LuckSnakeConfig>,
    
    /// 管理员账户
    /// 必须是程序配置中设置的管理员
    /// 需要签名授权
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// 财库账户
    /// 存储所有用户支付的费用
    /// 资金将从这里转出
    #[account(mut, signer)]
    pub treasury: SystemAccount<'info>,
    
    /// 接收方账户
    /// 接收提取的资金
    #[account(mut)]
    pub recipient: SystemAccount<'info>,
    
    /// 系统程序
    /// 用于转账操作
    pub system_program: Program<'info, System>,
}

/// 提取资金处理函数
/// 将财库中的所有资金转移到接收方账户
pub fn handler(ctx: Context<WithdrawFunds>) -> Result<()> {
    // 获取财库当前余额
    let treasury_balance = ctx.accounts.treasury.lamports();
    
    // 检查财库是否有资金可提取
    require!(
        treasury_balance > 0,
        LuckSnakeError::NoFundsToWithdraw
    );
    
    // 创建转账指令，从财库转账到接收方
    let transfer_instruction = system_program::Transfer {
        from: ctx.accounts.treasury.to_account_info(),
        to: ctx.accounts.recipient.to_account_info(),
    };
    
    // 创建CPI上下文
    let transfer_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        transfer_instruction,
    );
    
    // 执行转账
    system_program::transfer(transfer_context, treasury_balance)?;
    
    // 记录提取日志
    msg!(
        "提取 {} lamports 到地址 {}",
        treasury_balance,
        ctx.accounts.recipient.key()
    );
    
    Ok(())
}