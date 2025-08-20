use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;

/// 初始化指令的账户结构
/// 定义初始化程序所需的所有账户
#[derive(Accounts)]
pub struct Initialize<'info> {
    /// 程序配置账户
    /// 使用init约束创建新账户
    /// 使用PDA（程序派生地址）确保唯一性
    #[account(
        init,                                    // 初始化新账户
        payer = authority,                       // 支付账户创建费用的账户
        space = LuckSnakeConfig::LEN,           // 账户空间大小
        seeds = [LuckSnakeConfig::SEED],        // PDA种子
        bump                                     // 自动计算并存储bump值
    )]
    pub config: Account<'info, LuckSnakeConfig>,
    
    /// 程序管理员账户
    /// 需要签名，将成为程序的管理员
    /// 同时也是支付账户创建费用的账户
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// 财库账户
    /// 用于接收用户支付的费用
    /// 可以是任何有效的系统账户
    pub treasury: SystemAccount<'info>,
    
    /// 系统程序
    /// 用于创建账户和转账等系统操作
    pub system_program: Program<'info, System>,
}

/// 初始化处理函数
/// 设置程序的初始配置
pub fn handler(ctx: Context<Initialize>) -> Result<()> {
    // 获取配置账户的可变引用
    let config = &mut ctx.accounts.config;
    
    // 设置管理员地址为当前签名者
    config.authority = ctx.accounts.authority.key();
    
    // 设置生成数字的价格（100,000 lamports）
    config.generation_price = LuckSnakeConfig::GENERATION_PRICE;
    
    // 初始化已生成数字计数器为0
    config.total_generated_numbers = 0;
    
    // 设置财库地址
    config.treasury = ctx.accounts.treasury.key();
    
    // 存储PDA的bump值，用于后续验证
    config.bump = ctx.bumps.config;
    
    Ok(())
}