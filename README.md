# LuckSnake Solana

Solana版本的随机数字生成系统，基于以太坊LuckSnake合约移植。

## 功能特性

- 用户支付100,000 lamports（约0.0001 SOL）生成0-999范围内的唯一随机数
- 每个用户获得的数字保证不重复
- 管理员可以提取合约资金
- 使用Anchor框架构建

## 项目结构

```
src/
├── lib.rs              # 主程序入口
├── state.rs            # 账户数据结构
├── errors.rs           # 错误类型定义
└── instructions/       # 指令处理
    ├── initialize.rs   # 初始化
    ├── generate_number.rs # 生成随机数
    └── withdraw_funds.rs  # 提取资金
```

## 安装依赖

### 1. 安装Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. 安装Solana CLI
Windows用户：
```bash
# 下载并运行Solana安装程序
curl -L https://github.com/anza-xyz/agave/releases/download/v2.1.10/solana-install-init-x86_64-pc-windows-msvc.exe -o solana-install-init.exe
solana-install-init.exe stable
```

Linux/Mac用户：
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

### 3. 安装Anchor
```bash
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
```

### 4. 安装Node依赖
```bash
npm install
```

## 构建和部署

### 构建程序
```bash
anchor build
```

### 运行测试
```bash
anchor test
```

### 部署到Devnet
```bash
# 配置Solana CLI使用Devnet
solana config set --url devnet

# 获取测试SOL
solana airdrop 2

# 部署程序
anchor deploy
```

## 主要功能

### 1. 初始化
设置程序管理员和财库地址

### 2. 生成随机数（generateNumber）
- 用户支付100,000 lamports
- 生成0-999之间的唯一随机数
- 随机数基于slot、用户nonce和地址生成
- 确保每个用户的数字不重复

### 3. 提取资金（withdrawFunds）
- 仅管理员可以执行
- 将财库中的所有资金转移到指定地址

## 与以太坊版本的差异

1. **价格单位**：使用lamports而非ETH（1 SOL = 10^9 lamports）
2. **账户模型**：使用PDA（程序派生地址）管理状态
3. **随机数生成**：使用slot和用户数据生成伪随机数
4. **存储方式**：使用Anchor账户结构存储数据

## 测试用例

测试文件位于 `tests/luck_snake.ts`，包含：
- 初始化测试
- 生成随机数测试
- 生成多个唯一数字测试
- 提取资金测试
- 权限验证测试

## 注意事项

- 随机数生成使用链上数据，不如Chainlink VRF安全
- 生产环境建议使用更安全的随机数源
- 确保有足够的SOL支付交易费用

## License

MIT