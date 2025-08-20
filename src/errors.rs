use anchor_lang::prelude::*;

/// 自定义错误类型
/// 定义程序可能遇到的各种错误情况
#[error_code]
pub enum LuckSnakeError {
    /// 支付金额不足
    /// 当用户支付的金额少于100,000 lamports时触发
    #[msg("Insufficient payment")]
    InsufficientPayment,
    
    /// 所有数字已被生成
    /// 当1000个数字（0-999）全部被生成后触发
    #[msg("All numbers have been generated")]
    AllNumbersGenerated,
    
    /// 无法生成唯一数字
    /// 当尝试多次后仍无法为用户生成不重复的数字时触发
    #[msg("Unable to generate unique number")]
    UnableToGenerateUniqueNumber,
    
    /// 无效的数字范围
    /// 当查询的数字超出0-999范围时触发
    #[msg("Invalid number range")]
    InvalidNumberRange,
    
    /// 没有可提取的资金
    /// 当财库余额为0时尝试提取资金触发
    #[msg("No funds to withdraw")]
    NoFundsToWithdraw,
    
    /// 数字已被生成
    /// 当某个特定数字已经被其他用户拥有时触发
    #[msg("Number already generated")]
    NumberAlreadyGenerated,
    
    /// 未授权操作
    /// 当非管理员尝试执行管理员操作时触发
    #[msg("Unauthorized")]
    Unauthorized,
    
    /// 用户账户已满
    /// 当用户账户中的数字数量达到上限时触发
    #[msg("User account full")]
    UserAccountFull,
}