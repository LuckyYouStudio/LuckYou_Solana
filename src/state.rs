use anchor_lang::prelude::*;

#[account]
pub struct Config {
    pub admin: Pubkey, // 管理员地址
    pub fee_rate: u8,  // 服务费比例（百分比）
    pub vault: Pubkey, // 金库账户地址
    pub bump: u8,      // PDA bump
}

#[account]
pub struct Bet {
    pub user: Pubkey,      // 用户地址
    pub round: u64,        // 所属轮次
    pub chosen_number: u8, // 用户选择的数字
    pub amount: u64,       // 投注金额
    pub claimed: bool,     // 是否已领奖
}

#[account]
pub struct Round {
    pub round: u64,                // 当前轮次编号
    pub random_result: Option<u8>, // 随机数结果
    pub total_bet: u64,            // 总投注额
    pub created_at: i64,           // 创建时间（时间戳）
}

#[account]
pub struct Vault {
    pub amount: u64, // 当前累积服务费金额
    pub bump: u8,    // PDA bump
}

impl Config {
    #[allow(dead_code)]
    pub const LEN: usize = 8 + 32 + 1 + 32 + 1; // 结构体大小计算
}

impl Bet {
    #[allow(dead_code)]
    pub const LEN: usize = 8 + 32 + 8 + 1 + 8 + 1;
}

impl Round {
    #[allow(dead_code)]
    pub const LEN: usize = 8 + 1 + 8 + 8;
}

impl Vault {
    #[allow(dead_code)]
    pub const LEN: usize = 8 + 8 + 1;
}
