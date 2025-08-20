import { Connection, Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { getProgram, getConfigPDA } from './program';
import { IDL } from '../types/luck_snake';

// 初始化程序的工具脚本
export async function initializeProgram() {
  const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
  
  // 创建一个临时钱包用于初始化
  const payer = Keypair.generate();
  const treasury = Keypair.generate();
  
  console.log('🚀 开始初始化 LuckSnake 程序...');
  console.log(`💳 管理员地址: ${payer.publicKey.toString()}`);
  console.log(`🏦 财库地址: ${treasury.publicKey.toString()}`);
  
  try {
    // 给管理员账户空投资金
    console.log('💰 请求空投资金...');
    const airdropSignature = await connection.requestAirdrop(
      payer.publicKey,
      5 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropSignature, 'confirmed');
    console.log('✅ 空投成功');

    // 创建 provider 和 program
    const wallet = new Wallet(payer);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });

    const program = getProgram(provider);
    const [configPDA] = getConfigPDA();

    // 检查程序是否已经初始化
    try {
      const config = await (program.account as any)['luckSnakeConfig'].fetch(configPDA);
      console.log('⚠️ 程序已经初始化');
      console.log(`📊 当前配置:`);
      console.log(`   管理员: ${config.authority.toString()}`);
      console.log(`   财库: ${config.treasury.toString()}`);
      console.log(`   生成费用: ${config.generationPrice.toNumber() / LAMPORTS_PER_SOL} SOL`);
      console.log(`   总生成数量: ${config.totalGeneratedNumbers.toNumber()}`);
      return;
    } catch (error) {
      console.log('✅ 程序未初始化，开始初始化...');
    }

    // 初始化程序
    console.log('🔧 初始化程序配置...');
    const tx = await program.methods
      .initialize()
      .accounts({
        config: configPDA,
        authority: payer.publicKey,
        treasury: treasury.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`✅ 程序初始化成功!`);
    console.log(`🔗 交易签名: ${tx}`);
    
    // 验证初始化结果
    const config = await (program.account as any)['luckSnakeConfig'].fetch(configPDA);
    console.log(`📊 程序配置:`);
    console.log(`   管理员: ${config.authority.toString()}`);
    console.log(`   财库: ${config.treasury.toString()}`);
    console.log(`   生成费用: ${config.generationPrice.toNumber() / LAMPORTS_PER_SOL} SOL`);
    console.log(`   总生成数量: ${config.totalGeneratedNumbers.toNumber()}`);

  } catch (error) {
    console.error('❌ 初始化失败:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeProgram();
}