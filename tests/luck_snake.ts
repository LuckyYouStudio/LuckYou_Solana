import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LuckSnake } from "../target/types/luck_snake";
import { expect } from "chai";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("luck_snake", () => {
  // 设置provider和program
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.LuckSnake as Program<LuckSnake>;
  const authority = provider.wallet.publicKey;
  const treasury = anchor.web3.Keypair.generate();

  // 计算配置账户的PDA地址
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  // 测试：初始化程序
  it("初始化程序", async () => {
    // 调用初始化指令
    const tx = await program.methods
      .initialize()
      .accounts({
        config: configPda,                      // 配置账户PDA
        authority: authority,                    // 管理员账户
        treasury: treasury.publicKey,           // 财库账户
        systemProgram: SystemProgram.programId, // 系统程序
      })
      .rpc();

    // 获取配置账户数据并验证
    const config = await program.account.luckSnakeConfig.fetch(configPda);
    
    // 验证管理员地址
    expect(config.authority.toString()).to.equal(authority.toString());
    // 验证财库地址
    expect(config.treasury.toString()).to.equal(treasury.publicKey.toString());
    // 验证生成价格（100,000 lamports）
    expect(config.generationPrice.toNumber()).to.equal(100000);
    // 验证初始计数为0
    expect(config.totalGeneratedNumbers).to.equal(0);
  });

  // 测试：生成随机数字
  it("生成一个随机数字", async () => {
    // 创建一个新用户
    const user = anchor.web3.Keypair.generate();
    
    // 给用户账户充值20 SOL用于测试（包含动态账户增长的租金）
    await provider.connection.requestAirdrop(
      user.publicKey,
      20 * LAMPORTS_PER_SOL
    );
    
    // 等待充值确认
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 计算用户账户的PDA地址
    const [userAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user.publicKey.toBuffer()],
      program.programId
    );

    // 调用生成数字指令
    const tx = await program.methods
      .generateNumber()
      .accounts({
        config: configPda,                      // 配置账户
        userAccount: userAccountPda,            // 用户账户PDA
        user: user.publicKey,                   // 用户钱包
        treasury: treasury.publicKey,           // 财库账户
        systemProgram: SystemProgram.programId, // 系统程序
      })
      .signers([user])  // 用户签名
      .rpc();

    // 获取用户账户数据并验证
    const userAccount = await program.account.userAccount.fetch(userAccountPda);
    
    // 验证用户拥有1个数字
    expect(userAccount.numbers.length).to.equal(1);
    // 验证数字在0-999范围内
    expect(userAccount.numbers[0]).to.be.gte(0);
    expect(userAccount.numbers[0]).to.be.lte(999);
    // 验证nonce值增加到1
    expect(userAccount.nonce.toNumber()).to.equal(1);

    // 验证全局计数器增加
    const config = await program.account.luckSnakeConfig.fetch(configPda);
    expect(config.totalGeneratedNumbers).to.equal(1);
  });

  // 测试：为同一用户生成多个唯一数字
  it("为同一用户生成多个唯一数字", async () => {
    // 创建新用户
    const user = anchor.web3.Keypair.generate();
    
    // 充值
    await provider.connection.requestAirdrop(
      user.publicKey,
      20 * LAMPORTS_PER_SOL
    );
    
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 计算用户账户PDA
    const [userAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user.publicKey.toBuffer()],
      program.programId
    );

    // 生成3个数字
    for (let i = 0; i < 3; i++) {
      await program.methods
        .generateNumber()
        .accounts({
          config: configPda,
          userAccount: userAccountPda,
          user: user.publicKey,
          treasury: treasury.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
    }

    // 获取用户账户数据
    const userAccount = await program.account.userAccount.fetch(userAccountPda);
    
    // 验证用户拥有3个数字
    expect(userAccount.numbers.length).to.equal(3);
    
    // 验证所有数字都是唯一的
    const uniqueNumbers = new Set(userAccount.numbers);
    expect(uniqueNumbers.size).to.equal(3);
  });

  // 测试：提取资金
  it("提取资金", async () => {
    // 先给财库充值一些资金
    await provider.connection.requestAirdrop(
      treasury.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // 创建接收方账户
    const recipient = anchor.web3.Keypair.generate();
    
    // 获取财库余额（提取前）
    const treasuryBalanceBefore = await provider.connection.getBalance(treasury.publicKey);
    
    // 调用提取资金指令
    const tx = await program.methods
      .withdrawFunds()
      .accounts({
        config: configPda,                      // 配置账户
        authority: authority,                    // 管理员账户
        treasury: treasury.publicKey,           // 财库账户
        recipient: recipient.publicKey,         // 接收方账户
        systemProgram: SystemProgram.programId, // 系统程序
      })
      .signers([treasury])  // 财库需要签名
      .rpc();

    // 验证接收方收到资金
    const recipientBalance = await provider.connection.getBalance(recipient.publicKey);
    expect(recipientBalance).to.be.gt(0);
    
    // 验证财库余额变为0
    const treasuryBalanceAfter = await provider.connection.getBalance(treasury.publicKey);
    expect(treasuryBalanceAfter).to.equal(0);
  });

  // 测试：非管理员尝试提取资金应失败
  it("非管理员尝试提取资金应失败", async () => {
    // 创建非管理员账户
    const nonAuthority = anchor.web3.Keypair.generate();
    const recipient = anchor.web3.Keypair.generate();
    
    try {
      // 尝试以非管理员身份提取资金
      await program.methods
        .withdrawFunds()
        .accounts({
          config: configPda,
          authority: nonAuthority.publicKey,    // 使用非管理员账户
          treasury: treasury.publicKey,
          recipient: recipient.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([nonAuthority, treasury])  // 财库也需要签名
        .rpc();
      
      // 如果没有抛出错误，测试失败
      expect.fail("应该抛出错误");
    } catch (error) {
      // 验证错误信息包含约束失败（can use "constraint" or check for specific error codes）
      expect(error.toString()).to.include("ConstraintHasOne");
    }
  });
});