import * as anchor from "@coral-xyz/anchor";
import { SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

// 简单测试脚本 - 不依赖生成的类型
async function simpleTest() {
  console.log("🎲 测试数字生成功能...");

  // 设置 Provider
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  
  // 直接使用 IDL 创建程序
  const programId = new anchor.web3.PublicKey("F4gich1NV3oAT7UFbqQP5ERr8Sk7zUqebsbmsHffiBp1");
  
  // 简化的 IDL - 只包含需要的部分
  const idl = {
    "version": "0.1.0",
    "name": "luck_snake",
    "instructions": [
      {
        "name": "generateNumber",
        "accounts": [
          { "name": "config", "isMut": true, "isSigner": false },
          { "name": "userAccount", "isMut": true, "isSigner": false },
          { "name": "user", "isMut": true, "isSigner": true },
          { "name": "treasury", "isMut": true, "isSigner": false },
          { "name": "systemProgram", "isMut": false, "isSigner": false }
        ],
        "args": []
      }
    ],
    "accounts": [
      {
        "name": "luckSnakeConfig",
        "type": {
          "kind": "struct",
          "fields": [
            { "name": "authority", "type": "publicKey" },
            { "name": "generationPrice", "type": "u64" },
            { "name": "totalGeneratedNumbers", "type": "u32" },
            { "name": "treasury", "type": "publicKey" },
            { "name": "bump", "type": "u8" }
          ]
        }
      },
      {
        "name": "userAccount",
        "type": {
          "kind": "struct",
          "fields": [
            { "name": "user", "type": "publicKey" },
            { "name": "numbers", "type": { "vec": "u32" } },
            { "name": "nonce", "type": "u64" },
            { "name": "bump", "type": "u8" }
          ]
        }
      }
    ]
  };

  const program = new anchor.Program(idl, programId.toString(), provider);

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
    console.log(`\\n👤 测试用户: ${user.publicKey.toString()}`);

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

    // 6. 检查用户账户信息
    const userAccount = await program.account.userAccount.fetch(userAccountPDA);
    console.log("📋 用户账户信息:");
    console.log(`   用户: ${userAccount.user.toString()}`);
    console.log(`   数字: [${userAccount.numbers.map(n => n.toNumber()).join(', ')}]`);
    console.log(`   Nonce: ${userAccount.nonce.toNumber()}`);

    console.log("\\n✅ 测试成功！");

  } catch (error) {
    console.error("❌ 测试失败:", error);
    if (error.logs) {
      console.error("详细错误日志:", error.logs);
    }
  }
}

simpleTest();