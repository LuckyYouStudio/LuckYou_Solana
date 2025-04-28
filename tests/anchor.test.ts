import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { assert } from 'chai';
import { Lottery } from '../target/types/lottery';

describe('LuckYou Lottery Tests', () => {
    // 配置本地验证器
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // 获取程序ID和程序对象
    const program = anchor.workspace.Lottery as Program<Lottery>;

    // 测试账户
    const admin = Keypair.generate();
    const user = Keypair.generate();

    // PDA账户
    let configPDA: PublicKey;
    let vaultPDA: PublicKey;
    let roundPDA: PublicKey;
    let currentRound = new anchor.BN(1);

    // 生成PDA地址
    before(async () => {
        // 向测试账户转账SOL
        await provider.connection.requestAirdrop(admin.publicKey, 10 * LAMPORTS_PER_SOL);
        await provider.connection.requestAirdrop(user.publicKey, 10 * LAMPORTS_PER_SOL);

        // 等待确认
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 生成Config PDA
        [configPDA] = await PublicKey.findProgramAddress(
            [Buffer.from('config')],
            program.programId
        );

        // 生成Vault PDA
        [vaultPDA] = await PublicKey.findProgramAddress(
            [Buffer.from('vault'), configPDA.toBuffer()],
            program.programId
        );

        // 生成Round PDA
        [roundPDA] = await PublicKey.findProgramAddress(
            [Buffer.from('round'), currentRound.toArrayLike(Buffer, 'le', 8)],
            program.programId
        );
    });

    it('初始化彩票系统', async () => {
        // 初始化配置
        await program.methods.initialize(new anchor.BN(5)) // 5%的服务费率
            .accounts({
                config: configPDA,
                vault: vaultPDA,
                round: roundPDA,
                admin: admin.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([admin])
            .rpc();

        // 验证配置
        const config = await program.account.config.fetch(configPDA);
        assert.equal(config.admin.toString(), admin.publicKey.toString());
        assert.equal(config.feeRate, 5);
    });

    it('用户投注彩票', async () => {
        // 用户选择的数字和投注金额
        const chosenNumber = 888;
        const betAmount = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL

        // 生成用户投注PDA
        const [betPDA] = await PublicKey.findProgramAddress(
            [
                Buffer.from('bet'),
                user.publicKey.toBuffer(),
                currentRound.toArrayLike(Buffer, 'le', 8)
            ],
            program.programId
        );

        // 执行投注
        await program.methods.placeBet(
            new anchor.BN(chosenNumber),
            new anchor.BN(betAmount)
        )
            .accounts({
                config: configPDA,
                round: roundPDA,
                bet: betPDA,
                vault: vaultPDA,
                user: user.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([user])
            .rpc();

        // 验证投注记录
        const betAccount = await program.account.bet.fetch(betPDA);
        assert.equal(betAccount.user.toString(), user.publicKey.toString());
        assert.equal(betAccount.chosenNumber.toNumber(), chosenNumber);
        assert.equal(betAccount.claimed, false);

        // 验证轮次信息更新
        const roundAccount = await program.account.round.fetch(roundPDA);
        assert.isTrue(roundAccount.totalBet.gt(new anchor.BN(0)));

        // 验证金库更新
        const vaultAccount = await program.account.vault.fetch(vaultPDA);
        const expectedFee = betAmount * 0.05; // 5%服务费
        assert.isTrue(vaultAccount.amount.toNumber() > 0);

        console.log('投注成功! 选择数字:', chosenNumber);
        console.log('投注金额:', betAmount / LAMPORTS_PER_SOL, 'SOL');
        console.log('服务费:', vaultAccount.amount.toNumber() / LAMPORTS_PER_SOL, 'SOL');
    });
});
