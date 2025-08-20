import React, { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  getProgram, 
  createProgramOperations, 
  ProgramOperations
} from '../utils/program';
import './LuckSnakeApp.css';

interface UserAccountData {
  user: PublicKey;
  numbers: number[];
  nonce: number;
  bump: number;
}

interface ConfigData {
  authority: PublicKey;
  treasury: PublicKey;
  generationPrice: number;
  totalGeneratedNumbers: number;
  bump: number;
}

export const LuckSnakeApp: React.FC = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  
  const [programOps, setProgramOps] = useState<ProgramOperations | null>(null);
  const [userAccount, setUserAccount] = useState<UserAccountData | null>(null);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [txSignature, setTxSignature] = useState<string>('');

  // 初始化程序操作
  useEffect(() => {
    if (wallet.publicKey && wallet.signTransaction && wallet.signAllTransactions) {
      // 创建钱包适配器，确保正确的签名方法
      const walletAdapter = {
        publicKey: wallet.publicKey,
        signTransaction: async (transaction: any) => {
          console.log('🔐 签名交易:', transaction);
          return await wallet.signTransaction!(transaction);
        },
        signAllTransactions: async (transactions: any[]) => {
          console.log('🔐 批量签名交易:', transactions.length, '个');
          return await wallet.signAllTransactions!(transactions);
        },
      };
      
      const provider = new AnchorProvider(
        connection,
        walletAdapter,
        { 
          commitment: 'confirmed',
          preflightCommitment: 'confirmed',
          skipPreflight: false, // 启用预检查以获得更好的错误信息
        }
      );
      
      console.log('🔧 Provider配置:');
      console.log('- 钱包地址:', provider.wallet.publicKey.toString());
      console.log('- 连接端点:', connection.rpcEndpoint);
      
      const program = getProgram(provider);
      const ops = createProgramOperations(program, wallet);
      setProgramOps(ops);
    } else {
      setProgramOps(null);
    }
  }, [connection, wallet]);

  // 获取余额
  const fetchBalance = useCallback(async () => {
    if (wallet.publicKey) {
      try {
        const balance = await connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error('获取余额失败:', error);
      }
    }
  }, [connection, wallet.publicKey]);

  // 获取账户数据
  const fetchAccountData = useCallback(async () => {
    if (!programOps) return;

    try {
      const [userAccountData, configData] = await Promise.all([
        programOps.getUserAccount(),
        programOps.getConfig()
      ]);
      
      setUserAccount(userAccountData);
      setConfig(configData);
    } catch (error) {
      console.error('获取账户数据失败:', error);
    }
  }, [programOps]);

  // 定期刷新数据
  useEffect(() => {
    if (wallet.publicKey) {
      fetchBalance();
      fetchAccountData();
      
      const interval = setInterval(() => {
        fetchBalance();
        fetchAccountData();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [wallet.publicKey, fetchBalance, fetchAccountData]);

  // 清除消息
  const clearMessages = () => {
    setError('');
    setSuccess('');
    setTxSignature('');
  };

  // 生成随机数字
  const handleGenerateNumber = async () => {
    if (!programOps) return;

    setIsLoading(true);
    clearMessages();

    try {
      const tx = await programOps.generateNumber();
      setSuccess('🎉 随机数字生成成功！');
      setTxSignature(tx);
      
      // 刷新数据
      setTimeout(() => {
        fetchAccountData();
        fetchBalance();
      }, 2000);

    } catch (error: any) {
      console.error('生成数字失败:', error);
      console.error('交易日志:', error.transactionLogs);
      if (error.message?.includes('insufficient funds')) {
        setError('❌ 余额不足，请充值后重试');
      } else if (error.message?.includes('UserAccountFull')) {
        setError('❌ 您的账户已满，无法生成更多数字');
      } else if (error.message?.includes('unauthorized signer')) {
        setError('❌ 权限错误，请检查钱包连接');
      } else {
        setError(`❌ 生成失败: ${error.message || '未知错误'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 申请空投
  const handleAirdrop = async () => {
    if (!wallet.publicKey) return;

    setIsLoading(true);
    clearMessages();

    try {
      const signature = await connection.requestAirdrop(
        wallet.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      
      await connection.confirmTransaction(signature, 'confirmed');
      setSuccess('💰 空投成功！已获得 2 SOL');
      
      setTimeout(() => {
        fetchBalance();
      }, 1000);

    } catch (error: any) {
      console.error('空投失败:', error);
      setError(`❌ 空投失败: ${error.message || '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!wallet.connected) {
    return (
      <div className="app-container">
        <div className="welcome-card">
          <h1>🐍 LuckSnake 幸运数字</h1>
          <p>连接钱包开始生成您的幸运数字</p>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🐍 LuckSnake 幸运数字</h1>
        <WalletMultiButton />
      </header>

      <div className="main-content">
        {/* 用户信息卡片 */}
        <div className="info-card">
          <h3>👤 账户信息</h3>
          <div className="info-row">
            <span>钱包地址:</span>
            <span className="address">{wallet.publicKey?.toString().slice(0, 8)}...{wallet.publicKey?.toString().slice(-8)}</span>
          </div>
          <div className="info-row">
            <span>余额:</span>
            <span className="balance">{balance.toFixed(4)} SOL</span>
          </div>
          {balance < 0.1 && (
            <button 
              className="airdrop-btn"
              onClick={handleAirdrop}
              disabled={isLoading}
            >
              💰 申请空投 (2 SOL)
            </button>
          )}
        </div>

        {/* 程序状态卡片 */}
        {config && (
          <div className="info-card">
            <h3>📊 程序状态</h3>
            <div className="info-row">
              <span>生成费用:</span>
              <span>{(config.generationPrice / LAMPORTS_PER_SOL).toFixed(6)} SOL</span>
            </div>
            <div className="info-row">
              <span>总生成数量:</span>
              <span>{config.totalGeneratedNumbers}</span>
            </div>
          </div>
        )}

        {/* 幸运数字卡片 */}
        <div className="lucky-numbers-card">
          <h3>🎲 您的幸运数字</h3>
          {userAccount ? (
            <div className="numbers-grid">
              {userAccount.numbers.length > 0 ? (
                userAccount.numbers.map((number, index) => (
                  <div key={index} className="number-badge">
                    {number}
                  </div>
                ))
              ) : (
                <p className="no-numbers">还没有幸运数字，点击下方按钮生成</p>
              )}
            </div>
          ) : (
            <p className="no-account">账户未初始化，生成第一个数字将自动创建账户</p>
          )}
          
          <button
            className="generate-btn"
            onClick={handleGenerateNumber}
            disabled={isLoading || !programOps}
          >
            {isLoading ? '🔄 生成中...' : '🎲 生成幸运数字'}
          </button>
          
          {userAccount && (
            <p className="numbers-count">
              已拥有 {userAccount.numbers.length} 个数字
            </p>
          )}
        </div>

        {/* 消息显示 */}
        {error && (
          <div className="message error-message">
            {error}
          </div>
        )}
        
        {success && (
          <div className="message success-message">
            {success}
            {txSignature && (
              <div className="tx-link">
                <a 
                  href={`https://explorer.solana.com/tx/${txSignature}?cluster=custom&customUrl=http://127.0.0.1:8899`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🔍 查看交易详情
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};