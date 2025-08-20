use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::errors::LuckSnakeError;

/// 生成数字指令的账户结构
/// 定义生成随机数字所需的所有账户
#[derive(Accounts)]
pub struct GenerateNumber<'info> {
    /// 程序配置账户
    /// 包含价格、计数等全局配置信息
    #[account(
        mut,                                    // 需要修改（更新计数器）
        seeds = [LuckSnakeConfig::SEED],       // 使用PDA种子验证
        bump = config.bump                     // 验证bump值
    )]
    pub config: Account<'info, LuckSnakeConfig>,
    
    /// 用户账户
    /// 存储用户拥有的所有数字
    /// 如果不存在则自动创建
    #[account(
        init_if_needed,                        // 如果账户不存在则创建
        payer = user,                          // 用户支付创建费用
        space = UserAccount::LEN,             // 账户空间大小
        seeds = [UserAccount::SEED, user.key().as_ref()], // PDA种子包含用户地址
        bump                                   // 自动计算bump值
    )]
    pub user_account: Account<'info, UserAccount>,
    
    /// 用户钱包账户
    /// 需要签名，支付生成费用
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// 财库账户
    /// 接收用户支付的费用
    #[account(mut)]
    pub treasury: SystemAccount<'info>,
    
    /// 系统程序
    /// 用于转账操作
    pub system_program: Program<'info, System>,
}

/// 生成数字处理函数
/// 为用户生成一个唯一的随机数字
pub fn handler(ctx: Context<GenerateNumber>) -> Result<()> {
    // 获取账户引用
    let config = &mut ctx.accounts.config;
    let user_account = &mut ctx.accounts.user_account;
    
    // 检查是否还有剩余数字可生成
    require!(
        config.total_generated_numbers < LuckSnakeConfig::MAX_NUMBERS,
        LuckSnakeError::AllNumbersGenerated
    );
    
    // 创建转账指令，从用户账户转账到财库
    let transfer_instruction = system_program::Transfer {
        from: ctx.accounts.user.to_account_info(),
        to: ctx.accounts.treasury.to_account_info(),
    };
    
    // 创建CPI上下文
    let transfer_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        transfer_instruction,
    );
    
    // 执行转账，收取生成费用
    system_program::transfer(transfer_context, config.generation_price)?;
    
    // 获取当前时钟，用于生成随机数
    let clock = Clock::get()?;
    
    // 创建随机种子
    // 使用slot、用户nonce和用户地址作为熵源
    let mut random_seed = [0u8; 32];
    random_seed[..8].copy_from_slice(&clock.slot.to_le_bytes());
    random_seed[8..16].copy_from_slice(&user_account.nonce.to_le_bytes());
    random_seed[16..].copy_from_slice(&ctx.accounts.user.key().to_bytes()[..16]);
    
    // 使用Keccak哈希生成随机数
    let hash = anchor_lang::solana_program::keccak::hash(&random_seed);
    let hash_bytes = hash.to_bytes();
    
    // 从哈希值中提取32位整数
    let random_value = u32::from_le_bytes([
        hash_bytes[0],
        hash_bytes[1], 
        hash_bytes[2],
        hash_bytes[3],
    ]);
    
    // 将随机值限制在0-999范围内
    let random_number = random_value % 1000;
    
    // 尝试找到一个用户还未拥有的数字
    let mut attempts = 0;
    let max_attempts = 100;  // 最多尝试100次
    let mut final_number = random_number;
    
    // 循环直到找到一个唯一的数字
    while attempts < max_attempts {
        let mut already_exists = false;
        
        // 检查用户是否已经拥有这个数字
        for existing_number in &user_account.numbers {
            if *existing_number == final_number {
                already_exists = true;
                break;
            }
        }
        
        // 如果数字不存在，使用它
        if !already_exists {
            break;
        }
        
        // 尝试下一个数字（循环0-999）
        final_number = (final_number + 1) % 1000;
        attempts += 1;
    }
    
    // 如果无法找到唯一数字，返回错误
    require!(
        attempts < max_attempts,
        LuckSnakeError::UnableToGenerateUniqueNumber
    );
    
    // 如果是新用户账户，初始化它
    if user_account.user == Pubkey::default() {
        user_account.user = ctx.accounts.user.key();
        user_account.numbers = Vec::new();
        user_account.nonce = 0;
        user_account.bump = ctx.bumps.user_account;
    }
    
    // 检查用户账户是否已满
    require!(
        user_account.numbers.len() < 1000,
        LuckSnakeError::UserAccountFull
    );
    
    // 将新数字添加到用户账户
    user_account.numbers.push(final_number);
    
    // 增加用户的nonce值，用于下次生成不同的随机数
    user_account.nonce += 1;
    
    // 更新全局计数器
    config.total_generated_numbers += 1;
    
    // 记录日志
    msg!("生成数字: {} 给用户: {}", final_number, ctx.accounts.user.key());
    
    Ok(())
}