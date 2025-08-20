import * as anchor from "@coral-xyz/anchor";
import { SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

// 调试测试 - 不捕捉任何错误
async function debugTest() {
  console.log("🔍 调试测试数字生成功能...");

  // 设置 Provider
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const program = anchor.workspace.LuckSnake;
  
  console.log(`📦 程序ID: ${program.programId.toString()}`);

  // 1. 获取配置信息
  const [configPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const config = await program.account.luckSnakeConfig.fetch(configPDA);
  console.log("📊 程序配置:");
  console.log(`   管理员: ${config.authority.toString()}`);
  console.log(`   财库: ${config.treasury.toString()}`);
  console.log(`   生成价格: ${config.generationPrice / LAMPORTS_PER_SOL} SOL`);

  // 2. 创建测试用户
  const user = anchor.web3.Keypair.generate();
  console.log(`\\n👤 测试用户: ${user.publicKey.toString()}`);

  // 3. 空投资金给用户
  console.log("💰 请求空投...");
  await provider.connection.requestAirdrop(user.publicKey, 20 * LAMPORTS_PER_SOL);
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const initialBalance = await provider.connection.getBalance(user.publicKey);
  console.log(`💰 用户余额: ${initialBalance / LAMPORTS_PER_SOL} SOL`);

  // 4. 计算用户账户 PDA
  const [userAccountPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("user"), user.publicKey.toBuffer()],
    program.programId
  );
  console.log(`📝 用户账户 PDA: ${userAccountPDA.toString()}`);

  // 5. 检查预期的账户大小和租金
  const accountSize = 8 + 32 + 4 + (10 * 4) + 8 + 1; // 预分配10个数字的空间
  console.log(`📏 预期账户大小: ${accountSize} 字节`);
  
  const rent = await provider.connection.getMinimumBalanceForRentExemption(accountSize);
  console.log(`💰 账户租金需求: ${rent / LAMPORTS_PER_SOL} SOL`);

  // 6. 生成第一个数字 - 不捕捉错误，让错误完全显示
  console.log("\\n🎯 生成第一个数字...");
  
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

  // 7. 等待确认
  console.log("⏳ 等待交易确认...");
  await provider.connection.confirmTransaction(tx1, "confirmed");

  // 8. 检查用户账户信息
  console.log("📋 检查用户账户...");
  const userAccount = await program.account.userAccount.fetch(userAccountPDA);
  console.log("📋 用户账户信息:");
  console.log(`   用户: ${userAccount.user.toString()}`);
  console.log(`   数字: [${userAccount.numbers.join(', ')}]`);
  console.log(`   Nonce: ${userAccount.nonce}`);

  console.log("\\n✅ 测试成功！");
}

debugTest().catch(console.error);