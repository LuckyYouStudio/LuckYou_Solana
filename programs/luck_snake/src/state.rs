use anchor_lang::prelude::*;

/// 程序配置账户
/// 存储程序的全局配置信息
#[account]
pub struct LuckSnakeConfig {
    /// 程序管理员地址，拥有提取资金等管理权限
    pub authority: Pubkey,
    /// 生成一个数字的价格（单位：lamports）
    pub generation_price: u64,
    /// 已生成的数字总数，用于统计和限制
    pub total_generated_numbers: u32,
    /// 财库地址，收集用户支付的费用
    pub treasury: Pubkey,
    /// PDA bump种子，用于生成程序派生地址
    pub bump: u8,
}

impl LuckSnakeConfig {
    /// 账户大小：8字节判别器 + 32字节管理员 + 8字节价格 + 4字节计数 + 32字节财库 + 1字节bump
    pub const LEN: usize = 8 + 32 + 8 + 4 + 32 + 1;
    /// PDA种子前缀
    pub const SEED: &'static [u8] = b"config";
    /// 生成价格：100,000 lamports (约0.0001 SOL)
    pub const GENERATION_PRICE: u64 = 100_000;
    /// 最大可生成数字数量：1000个（0-999）
    pub const MAX_NUMBERS: u32 = 1000;
}

/// 数字记录账户
/// 记录每个生成的数字及其所有者信息
#[account]
pub struct NumberRecord {
    /// 生成的数字（0-999）
    pub number: u32,
    /// 数字的所有者地址
    pub owner: Pubkey,
    /// 生成时间戳
    pub generated_at: i64,
    /// PDA bump种子
    pub bump: u8,
}

impl NumberRecord {
    /// 账户大小：8字节判别器 + 4字节数字 + 32字节所有者 + 8字节时间戳 + 1字节bump
    pub const LEN: usize = 8 + 4 + 32 + 8 + 1;
    
    /// 生成数字记录的PDA种子
    /// 将"number"前缀和数字值组合成种子
    pub fn seed(number: u32) -> Vec<u8> {
        let mut seed = b"number".to_vec();
        seed.extend_from_slice(&number.to_le_bytes());
        seed
    }
}

/// 用户账户
/// 存储用户拥有的所有数字和相关信息
#[account]
pub struct UserAccount {
    /// 用户的钱包地址
    pub user: Pubkey,
    /// 用户拥有的所有数字列表
    pub numbers: Vec<u32>,
    /// 用户的随机数种子计数器，用于生成随机数
    pub nonce: u64,
    /// PDA bump种子
    pub bump: u8,
}

impl UserAccount {
    /// 基础账户大小：8字节判别器 + 32字节用户 + 4字节向量长度 + 8字节nonce + 1字节bump
    /// 初始不包含任何数字，每个数字需要额外4字节
    pub const BASE_LEN: usize = 8 + 32 + 4 + 8 + 1;
    /// 每个数字占用的空间
    pub const NUMBER_SIZE: usize = 4;
    /// PDA种子前缀
    pub const SEED: &'static [u8] = b"user";
    
    /// 根据数字数量计算所需的账户大小
    pub fn space_for_numbers(count: usize) -> usize {
        Self::BASE_LEN + (count * Self::NUMBER_SIZE)
    }
    
    /// 计算当前账户大小
    pub fn current_space(&self) -> usize {
        Self::space_for_numbers(self.numbers.len())
    }
    
    /// 计算添加一个数字后的账户大小
    pub fn space_after_adding_number(&self) -> usize {
        Self::space_for_numbers(self.numbers.len() + 1)
    }
}