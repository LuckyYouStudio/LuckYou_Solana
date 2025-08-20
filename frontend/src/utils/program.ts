import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { IDL } from '../types/luck_snake';

// 程序常量
export const PROGRAM_ID = new PublicKey('F4gich1NV3oAT7UFbqQP5ERr8Sk7zUqebsbmsHffiBp1');
export const NETWORK = 'http://127.0.0.1:8899'; // 本地测试网络

// 初始化连接
export const getConnection = () => new Connection(NETWORK, 'confirmed');

// 获取程序实例
export const getProgram = (provider: AnchorProvider) => {
  return new Program(IDL, provider);
};

// 计算配置账户的 PDA
export const getConfigPDA = (): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    PROGRAM_ID
  );
};

// 计算用户账户的 PDA
export const getUserAccountPDA = (userPublicKey: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('user'), userPublicKey.toBuffer()],
    PROGRAM_ID
  );
};

// 程序操作接口
export interface ProgramOperations {
  // 初始化程序
  initialize: (treasury: PublicKey) => Promise<string>;
  
  // 生成随机数字
  generateNumber: () => Promise<string>;
  
  // 获取用户账户信息
  getUserAccount: () => Promise<{
    user: PublicKey;
    numbers: number[];
    nonce: number;
    bump: number;
  } | null>;
  
  // 获取程序配置
  getConfig: () => Promise<{
    authority: PublicKey;
    treasury: PublicKey;
    generationPrice: number;
    totalGeneratedNumbers: number;
    bump: number;
  } | null>;
}

// 创建程序操作实例
export const createProgramOperations = (
  program: any,
  wallet: any
): ProgramOperations => {
  const [configPDA] = getConfigPDA();

  return {
    // 初始化程序
    initialize: async (treasury: PublicKey): Promise<string> => {
      const tx = await program.methods
        .initialize()
        .accounts({
          config: configPDA,
          authority: wallet.publicKey,
          treasury: treasury,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      return tx;
    },

    // 生成随机数字
    generateNumber: async (): Promise<string> => {
      // 获取配置
      const config = await (program.account as any)['luckSnakeConfig'].fetch(configPDA);
      
      console.log('交易账户信息:');
      console.log('- treasury:', config.treasury.toString());
      console.log('- 程序ID:', program.programId.toString());
      
      console.log('🔍 开始构建交易...');
      
      // 使用最简单的方式，让Anchor自动推导其他账户
      try {
        console.log('使用最小账户传递方式...');
        const txHash = await program.methods
          .generateNumber()
          .accounts({
            treasury: config.treasury,
          })
          .rpc();
        
        console.log('✅ 交易成功:', txHash);
        return txHash;
      } catch (error) {
        console.log('生成失败:', error instanceof Error ? error.message : String(error));
        
        // 如果失败，尝试显式传递所有账户
        try {
          console.log('尝试显式传递所有账户...');
          const [userAccountPDA] = getUserAccountPDA(wallet.publicKey);
          
          const txHash = await program.methods
            .generateNumber()
            .accounts({
              config: configPDA,
              userAccount: userAccountPDA,
              user: wallet.publicKey,
              treasury: config.treasury,
              systemProgram: SystemProgram.programId,
            })
            .rpc();
          
          console.log('✅ 交易成功:', txHash);
          return txHash;
        } catch (error2) {
          console.log('显式传递失败:', error2 instanceof Error ? error2.message : String(error2));
          throw error2;
        }
      }
    },

    // 获取用户账户信息
    getUserAccount: async () => {
      try {
        // 计算用户账户PDA
        const [userAccountPDA] = getUserAccountPDA(wallet.publicKey);
        
        // 直接获取账户信息，因为我们使用了AccountInfo
        const connection = program.provider.connection;
        const accountInfo = await connection.getAccountInfo(userAccountPDA);
        
        if (!accountInfo || accountInfo.data.length < 53) {
          console.log('用户账户不存在或数据不完整');
          return null;
        }
        
        // 手动解析账户数据
        const data = accountInfo.data;
        
        // 跳过discriminator (8字节)
        let offset = 8;
        
        // 读取用户公钥 (32字节)
        const userPubkeyBytes = data.slice(offset, offset + 32);
        offset += 32;
        
        // 读取数字数量 (4字节)
        const numbersCount = data.readUInt32LE(offset);
        offset += 4;
        
        // 读取数字列表
        const numbers: number[] = [];
        for (let i = 0; i < numbersCount; i++) {
          if (offset + 4 <= data.length) {
            numbers.push(data.readUInt32LE(offset));
            offset += 4;
          }
        }
        
        // 读取nonce (8字节)
        const nonce = data.length >= offset + 8 ? data.readBigUInt64LE(offset) : BigInt(0);
        offset += 8;
        
        // 读取bump (1字节)
        const bump = data.length > offset ? data.readUInt8(offset) : 0;
        
        console.log(`✅ 解析用户账户: ${numbers.length} 个数字, nonce: ${nonce}`);
        
        return {
          user: new PublicKey(userPubkeyBytes),
          numbers: numbers,
          nonce: Number(nonce),
          bump: bump,
        };
      } catch (error) {
        console.log('用户账户获取失败:', error);
        return null;
      }
    },

    // 获取程序配置
    getConfig: async () => {
      try {
        const config = await (program.account as any)['luckSnakeConfig'].fetch(configPDA);
        return {
          authority: config.authority,
          treasury: config.treasury,
          generationPrice: typeof config.generationPrice === 'number' ? config.generationPrice : config.generationPrice.toNumber(),
          totalGeneratedNumbers: typeof config.totalGeneratedNumbers === 'number' ? config.totalGeneratedNumbers : config.totalGeneratedNumbers.toNumber(),
          bump: config.bump,
        };
      } catch (error) {
        console.log('程序配置不存在或获取失败:', error);
        return null;
      }
    },
  };
};