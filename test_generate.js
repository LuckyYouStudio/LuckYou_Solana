import * as anchor from "@coral-xyz/anchor";
import { SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { LuckSnake } from "./target/types/luck_snake.js";

// 简单的数字生成测试
async function testGenerateNumber() {
  console.log("🎲 开始测试数字生成功能...");

  // 设置 Provider
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const program = anchor.workspace.LuckSnake;

  try {
    // 1. 获取配置信息
    const [configPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    const config = await program.account.luckSnakeConfig.fetch(configPDA);
    console.log("📊 程序配置:");
    console.log(`   管理员: ${config.authority.toString()}`);
    console.log(`   财库: ${config.treasury.toString()}`);
    console.log(`   生成价格: ${config.generationPrice.toNumber() / LAMPORTS_PER_SOL} SOL`);
    console.log(`   总生成数: ${config.totalGeneratedNumbers.toNumber()}`);

    // 2. 创建测试用户
    const user = anchor.web3.Keypair.generate();
    console.log(`\n👤 测试用户: ${user.publicKey.toString()}`);

    // 3. 空投资金给用户
    await provider.connection.requestAirdrop(user.publicKey, 2 * LAMPORTS_PER_SOL);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const initialBalance = await provider.connection.getBalance(user.publicKey);
    console.log(`💰 用户余额: ${initialBalance / LAMPORTS_PER_SOL} SOL`);

    // 4. 计算用户账户 PDA
    const [userAccountPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user.publicKey.toBuffer()],
      program.programId
    );
    console.log(`📝 用户账户 PDA: ${userAccountPDA.toString()}`);

    // 5. 生成第一个数字
    console.log("\n🎯 生成第一个数字...");
    const tx1 = await program.methods
      .generateNumber()
      .accounts({
        config: configPDA,
        userAccount: userAccountPDA,
        user: user.publicKey,
        treasury: config.treasury,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();
    
    console.log(`✅ 交易签名: ${tx1}`);

    // 6. 检查用户账户信息
    const userAccount = await program.account.userAccount.fetch(userAccountPDA);
    console.log("📋 用户账户信息:");
    console.log(`   用户: ${userAccount.user.toString()}`);
    console.log(`   数字: [${userAccount.numbers.map(n => n.toNumber()).join(', ')}]`);
    console.log(`   Nonce: ${userAccount.nonce.toNumber()}`);

    // 7. 生成更多数字测试动态增长
    console.log("\n🎯 继续生成数字测试动态增长...");
    for (let i = 0; i < 5; i++) {
      const tx = await program.methods
        .generateNumber()
        .accounts({
          config: configPDA,
          userAccount: userAccountPDA,
          user: user.publicKey,
          treasury: config.treasury,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      
      console.log(`📦 生成数字 #${i + 2}, 交易: ${tx.substring(0, 8)}...`);
    }

    // 8. 最终检查用户账户
    const finalUserAccount = await program.account.userAccount.fetch(userAccountPDA);
    console.log("\n📊 最终用户账户信息:");
    console.log(`   总数字数量: ${finalUserAccount.numbers.length}`);
    console.log(`   数字列表: [${finalUserAccount.numbers.map(n => n.toNumber()).join(', ')}]`);
    console.log(`   Nonce: ${finalUserAccount.nonce.toNumber()}`);

    // 9. 检查余额变化
    const finalBalance = await provider.connection.getBalance(user.publicKey);
    const totalCost = initialBalance - finalBalance;
    console.log(`💸 总花费: ${totalCost / LAMPORTS_PER_SOL} SOL`);
    console.log(`💰 剩余余额: ${finalBalance / LAMPORTS_PER_SOL} SOL`);

    console.log("\n✅ 数字生成测试完成！");

  } catch (error) {
    console.error("❌ 测试失败:", error);
    if (error.logs) {
      console.error("详细错误日志:", error.logs);
    }
  }
}

testGenerateNumber();