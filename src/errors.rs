use anchor_lang::prelude::*;

#[error_code]
pub enum LotteryError {
    #[msg("无权限执行此操作")]
    Unauthorized,

    #[msg("投注金额无效")]
    InvalidBetAmount,

    #[msg("投注已存在或已领取")]
    AlreadyClaimed,

    #[msg("当前轮次未开奖")]
    ResultNotAvailable,

    #[msg("中奖条件未满足")]
    NotAWinner,

    #[msg("操作超时或无效轮次")]
    InvalidRound,

    #[msg("管理员地址不匹配")]
    InvalidAdmin,

    #[msg("Vault 提现失败")]
    VaultWithdrawFailed,

    #[msg("随机数未设置")]
    RandomNotSet,

    #[msg("投注数据不存在")]
    BetNotFound,

    #[msg("非法的选号")]
    InvalidNumber,
}
