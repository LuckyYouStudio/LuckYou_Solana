use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_lang::{AnchorDeserialize, AnchorSerialize};
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
        bump                                    // 验证bump值
    )]
    pub config: Account<'info, LuckSnakeConfig>,
    
    /// 用户账户
    /// 存储用户拥有的所有数字，动态增长
    /// CHECK: PDA账户使用seeds和bump约束验证，手动处理序列化以支持动态大小调整
    #[account(
        mut,
        seeds = [UserAccount::SEED, user.key().as_ref()], // PDA种子包含用户地址
        bump                            // 自动计算bump值
    )]
    pub user_account: AccountInfo<'info>,
    
    /// 用户钱包账户
    /// 需要签名，支付生成费用
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// 财库账户
    /// 接收用户支付的费用
    #[account(
        mut,
        constraint = treasury.key() == config.treasury @ LuckSnakeError::Unauthorized
    )]
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
    
    // 获取当前 nonce 值 - 我们稍后会重新获取，这里先用0
    let current_nonce: u64 = 0;
    
    // 创建随机种子
    // 使用slot、用户nonce和用户地址作为熵源
    let mut random_seed = [0u8; 32];
    random_seed[..8].copy_from_slice(&clock.slot.to_le_bytes());
    random_seed[8..16].copy_from_slice(&current_nonce.to_le_bytes());
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
        
        // 检查用户是否已经拥有这个数字 - 我们稍后会处理，现在跳过
        already_exists = false;
        
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
    
    // 检查账户状态
    let needs_init;
    let current_numbers_len;
    
    if ctx.accounts.user_account.data_len() < UserAccount::BASE_LEN {
        // 账户不存在或太小，需要初始化
        needs_init = true;
        current_numbers_len = 0;
        
        // 创建账户
        let rent = anchor_lang::prelude::Rent::get()?;
        let required_lamports = rent.minimum_balance(UserAccount::BASE_LEN);
        
        // 创建账户指令
        anchor_lang::system_program::create_account(
            anchor_lang::context::CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::CreateAccount {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.user_account.to_account_info(),
                },
                &[&[
                    UserAccount::SEED,
                    ctx.accounts.user.key().as_ref(),
                    &[ctx.bumps.user_account],
                ]],
            ),
            required_lamports,
            UserAccount::BASE_LEN as u64,
            &crate::ID,
        )?;
    } else {
        // 账户存在，反序列化检查
        let mut user_account_data = &ctx.accounts.user_account.try_borrow_data()?[8..]; // 跳过discriminator
        let user_account: UserAccount = anchor_lang::AnchorDeserialize::deserialize(&mut user_account_data)?;
        needs_init = user_account.user == Pubkey::default();
        current_numbers_len = user_account.numbers.len();
    }
    
    // 现在支持动态增长，不再限制数字数量（理论上最多受账户大小限制约10MB）
    
    // 手动处理账户数据
    let mut user_account_data = ctx.accounts.user_account.try_borrow_mut_data()?;
    
    // 反序列化现有账户（跳过8字节discriminator）
    let mut user_account: UserAccount = if needs_init {
        // 创建新的用户账户（不手动写入discriminator，try_serialize会处理）
        UserAccount {
            user: ctx.accounts.user.key(),
            numbers: Vec::new(),
            nonce: 0,
            bump: ctx.bumps.user_account,
        }
    } else {
        let mut data_slice = &user_account_data[8..];
        anchor_lang::AnchorDeserialize::deserialize(&mut data_slice)?
    };
    
    // 将新数字添加到用户账户
    user_account.numbers.push(final_number);
    
    // 增加用户的nonce值，用于下次生成不同的随机数
    user_account.nonce += 1;
    
    // 释放借用，以便进行账户大小调整
    drop(user_account_data);
    
    // 现在根据最终的数字数量计算所需大小
    let final_numbers_count = user_account.numbers.len();
    let required_size = UserAccount::space_for_numbers(final_numbers_count);
    let current_size = ctx.accounts.user_account.to_account_info().data_len();
    
    
    if required_size > current_size {
        // 计算所需的额外rent
        let rent = anchor_lang::prelude::Rent::get()?;
        let new_rent = rent.minimum_balance(required_size);
        let current_rent = rent.minimum_balance(current_size);
        let additional_lamports = new_rent.saturating_sub(current_rent);
        
        if additional_lamports > 0 {
            // 从用户账户转账到PDA以支付额外的rent
            anchor_lang::system_program::transfer(
                anchor_lang::context::CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.user.to_account_info(),
                        to: ctx.accounts.user_account.to_account_info(),
                    }
                ),
                additional_lamports,
            )?;
        }
        
        // 调整账户大小
        ctx.accounts.user_account.to_account_info().resize(required_size)?;
    }
    
    // 重新获取可变借用进行序列化
    let mut user_account_data = ctx.accounts.user_account.try_borrow_mut_data()?;
    
    // 序列化回去 - Anchor的try_serialize包含discriminator，所以我们使用完整的缓冲区
    let mut writer = &mut user_account_data[..]; // 使用完整缓冲区
    user_account.try_serialize(&mut writer)?;
    
    // 更新全局计数器
    config.total_generated_numbers += 1;
    
    // 记录日志
    msg!("生成数字: {} 给用户: {}", final_number, ctx.accounts.user.key());
    
    Ok(())
}