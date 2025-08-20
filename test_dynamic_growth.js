import * as anchor from "@coral-xyz/anchor";
import { SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

// 测试动态增长功能
async function testDynamicGrowth() {
  // 设置provider和program
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.LuckSnake;
  const authority = provider.wallet.publicKey;
  const treasury = anchor.web3.Keypair.generate();

  // 计算配置账户的PDA地址
  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  console.log("🚀 开始测试动态账户增长...\n");

  try {
    // 1. 检查程序是否已初始化
    console.log("1️⃣ 检查程序状态...");
    try {
      const config = await program.account.luckSnakeConfig.fetch(configPda);
      console.log("⚠️ 程序已经初始化");
      console.log(`📊 当前配置:`);
      console.log(`   管理员: ${config.authority.toString()}`);
      console.log(`   财库: ${config.treasury.toString()}`);
      console.log(`   生成费用: ${config.generationFee.toNumber() / LAMPORTS_PER_SOL} SOL`);
      console.log(`   总生成数量: ${config.totalGeneratedNumbers.toNumber()}`);
    } catch (error) {
      console.log("🔧 程序未初始化，开始初始化...");
      await program.methods
        .initialize()
        .accounts({
          config: configPda,
          authority: authority,
          treasury: treasury.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log("✅ 程序初始化成功");
    }

    // 2. 创建测试用户并给足够资金
    const user = anchor.web3.Keypair.generate();
    console.log("\n2️⃣ 创建测试用户并充值...");
    console.log(`用户地址: ${user.publicKey.toString()}`);
    
    // 给用户充值 50 SOL 确保有足够资金
    await provider.connection.requestAirdrop(
      user.publicKey,
      50 * LAMPORTS_PER_SOL
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const initialBalance = await provider.connection.getBalance(user.publicKey);
    console.log(`用户初始余额: ${initialBalance / LAMPORTS_PER_SOL} SOL`);

    // 计算用户账户PDA
    const [userAccountPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user.publicKey.toBuffer()],
      program.programId
    );

    // 3. 测试账户初始状态
    console.log("\n3️⃣ 检查用户账户初始状态...");
    try {
      const userAccount = await program.account.userAccount.fetch(userAccountPda);
      console.log("⚠️  用户账户已存在，这不应该发生");
    } catch (error) {
      console.log("✅ 用户账户不存在（预期行为）");
    }

    // 4. 第一次生成数字 - 创建账户
    console.log("\n4️⃣ 第一次生成数字（创建账户）...");
    const balanceBefore1 = await provider.connection.getBalance(user.publicKey);
    
    const tx1 = await program.methods
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

    const balanceAfter1 = await provider.connection.getBalance(user.publicKey);
    const cost1 = balanceBefore1 - balanceAfter1;

    // 获取账户信息
    const userAccount1 = await program.account.userAccount.fetch(userAccountPda);
    const accountInfo1 = await provider.connection.getAccountInfo(userAccountPda);

    console.log(`✅ 交易成功: ${tx1}`);
    console.log(`📊 账户大小: ${accountInfo1.data.length} 字节`);
    console.log(`🔢 拥有数字: [${userAccount1.numbers.join(', ')}]`);
    console.log(`💰 消耗成本: ${cost1 / LAMPORTS_PER_SOL} SOL`);
    console.log(`🎯 生成的数字: ${userAccount1.numbers[0]}`);

    // 5. 第二次生成数字 - 扩展账户
    console.log("\n5️⃣ 第二次生成数字（扩展账户）...");
    const balanceBefore2 = await provider.connection.getBalance(user.publicKey);
    
    const tx2 = await program.methods
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

    const balanceAfter2 = await provider.connection.getBalance(user.publicKey);
    const cost2 = balanceBefore2 - balanceAfter2;

    const userAccount2 = await program.account.userAccount.fetch(userAccountPda);
    const accountInfo2 = await provider.connection.getAccountInfo(userAccountPda);

    console.log(`✅ 交易成功: ${tx2}`);
    console.log(`📊 账户大小: ${accountInfo2.data.length} 字节 (增长了 ${accountInfo2.data.length - accountInfo1.data.length} 字节)`);
    console.log(`🔢 拥有数字: [${userAccount2.numbers.join(', ')}]`);
    console.log(`💰 消耗成本: ${cost2 / LAMPORTS_PER_SOL} SOL`);
    console.log(`🎯 新生成的数字: ${userAccount2.numbers[1]}`);

    // 6. 第三次生成数字 - 再次扩展
    console.log("\n6️⃣ 第三次生成数字（再次扩展）...");
    const balanceBefore3 = await provider.connection.getBalance(user.publicKey);
    
    const tx3 = await program.methods
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

    const balanceAfter3 = await provider.connection.getBalance(user.publicKey);
    const cost3 = balanceBefore3 - balanceAfter3;

    const userAccount3 = await program.account.userAccount.fetch(userAccountPda);
    const accountInfo3 = await provider.connection.getAccountInfo(userAccountPda);

    console.log(`✅ 交易成功: ${tx3}`);
    console.log(`📊 账户大小: ${accountInfo3.data.length} 字节 (总共增长了 ${accountInfo3.data.length - accountInfo1.data.length} 字节)`);
    console.log(`🔢 拥有数字: [${userAccount3.numbers.join(', ')}]`);
    console.log(`💰 消耗成本: ${cost3 / LAMPORTS_PER_SOL} SOL`);
    console.log(`🎯 新生成的数字: ${userAccount3.numbers[2]}`);

    // 7. 总结
    console.log("\n🎉 动态增长测试总结:");
    console.log("=" * 50);
    console.log(`📈 账户大小变化: ${accountInfo1.data.length} → ${accountInfo2.data.length} → ${accountInfo3.data.length} 字节`);
    console.log(`💰 成本对比:`);
    console.log(`   第一次（创建+1个数字）: ${cost1 / LAMPORTS_PER_SOL} SOL`);
    console.log(`   第二次（+1个数字）: ${cost2 / LAMPORTS_PER_SOL} SOL`);
    console.log(`   第三次（+1个数字）: ${cost3 / LAMPORTS_PER_SOL} SOL`);
    console.log(`🔢 数字唯一性: ${userAccount3.numbers.length === new Set(userAccount3.numbers).size ? '✅ 通过' : '❌ 失败'}`);
    console.log(`🎯 功能完整性: ${userAccount3.numbers.length === 3 ? '✅ 通过' : '❌ 失败'}`);

    const totalCost = cost1 + cost2 + cost3;
    const finalBalance = await provider.connection.getBalance(user.publicKey);
    console.log(`💳 用户最终余额: ${finalBalance / LAMPORTS_PER_SOL} SOL`);
    console.log(`💸 总消耗: ${totalCost / LAMPORTS_PER_SOL} SOL`);

  } catch (error) {
    console.error("❌ 测试失败:", error);
    console.error("详细错误:", error.logs || error.message);
  }
}

// 运行测试
testDynamicGrowth().catch(console.error);