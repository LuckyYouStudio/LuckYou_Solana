use anchor_lang::prelude::*;

// 引入模块
pub mod errors;      // 错误定义模块
pub mod instructions; // 指令处理模块
pub mod state;       // 状态/账户结构模块

use instructions::*;

// 程序ID - 这是部署后程序的唯一标识符
// 在实际部署时需要更新为真实的程序ID
declare_id!("F4gich1NV3oAT7UFbqQP5ERr8Sk7zUqebsbmsHffiBp1");

/// LuckSnake主程序
/// 实现了一个随机数字生成系统，用户支付费用后可以获得0-999范围内的唯一随机数
#[program]
pub mod luck_snake {
    use super::*;

    /// 初始化程序
    /// 设置程序的管理员和财库地址
    /// 只需要在程序首次部署后调用一次
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    /// 生成随机数字
    /// 用户支付100,000 lamports（约0.0001 SOL）来生成一个唯一的随机数字
    /// 数字范围是0-999，每个用户获得的数字保证不重复
    pub fn generate_number(ctx: Context<GenerateNumber>) -> Result<()> {
        instructions::generate_number::handler(ctx)
    }

    /// 提取资金
    /// 只有程序管理员可以调用此函数
    /// 将财库中的所有资金转移到指定的接收地址
    pub fn withdraw_funds(ctx: Context<WithdrawFunds>) -> Result<()> {
        instructions::withdraw_funds::handler(ctx)
    }
}